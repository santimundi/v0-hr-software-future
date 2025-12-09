import logging
import time
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from langgraph.graph import END
from langgraph.types import interrupt
from src.hr_agent.tools import get_rag_tools
from src.hr_agent.state import GeneratedDocsOutput, PolicyTestResults, QuerySummaryOutput, State
from src.hr_agent.logging_utils import *
from src.hr_agent.utils import extract_tool_calls, extract_tool_call, is_write_sql, serialize_pydantic_model, create_document
from src.hr_agent.prompts import *
from src.core.audit_helpers import *

logger = logging.getLogger(__name__)

class HR_Node:

    def __init__(self, llm, tools):
        """
        Initialize the HR_Node with an LLM and tools.
        """
        self.llm = llm

        # MCP tools (e.g., execute_sql, list_tables) passed in from app/graphbuilder
        self.tools = tools
        
        # RAG tools implemented in this service
        self.rag_tools = get_rag_tools()
        
        # Bind both MCP tools and RAG tools to the LLM for the main execute node
        self.llm_with_tools = llm.bind_tools(self.tools + self.rag_tools)
        

      
    def summarize_query_topic(self, state: State) -> State:
        """
        Generate a short, precise topic summary (3-6 words) for the user query.
        This runs before the main processing to capture the query topic for audit logging.
        
        Args:
            state: The current state containing the user query
        
        Returns:
            Updated state with query_topic field populated
        """       
        llm_with_structured_output = self.llm.with_structured_output(QuerySummaryOutput, method="json_schema")
         
        messages = [
            SystemMessage(content=QUERY_TOPIC_SUMMARIZATION_PROMPT),
            HumanMessage(content=state["user_query"])
        ]
        
        response = llm_with_structured_output.invoke(messages)

        logger.info(f"Query topic summarization response: {response}")
        logger.info(f"Route: {response.route}")

        return {
            "query_topic": response.query_topic.strip(), 
            "route": response.route
        }
    

    def route_input(self, state: State) -> str:
        """
        Route the input to the appropriate node based on the user query.
        Returns the name of the next node to execute.
        """
        if state.get("route") == "policy_studio":
            logger.info("Routing to policy_studio node")
            return "policy_studio"

        if state.get("route") == "onboarding":
            logger.info("Routing to onboarding node")
            return "onboarding"

        logger.info("Routing to process_query node")
        return "process_query"

    
    def policy_studio(self, state: State) -> State:
        """
        This node is called when the user query is a policy studio test case.
        It evaluates the test case against the company policy documents using tools.
        """
        log_node_entry("policy_studio")
        
        query = state.get("user_query", "")
        query_preview = query[:200] if query else None
        
        # Count scenarios from query
        scenario_matches = re.findall(r'^\d+\.', query, re.MULTILINE)
        num_scenarios = len(scenario_matches) if scenario_matches else 1
        
        logger.info(f"Policy studio: evaluating {num_scenarios} scenario(s)")
        audit_policy_studio_started(num_scenarios, query_preview)
        
        try:

            messages = [
                SystemMessage(content=POLICY_STUDIO_TESTING_PROMPT),
                *state["messages"],
                HumanMessage(content=query)
            ]


            response = self.llm_with_tools.invoke(messages)
            
            logger.info("Policy studio: analysis completed")
            return {"messages": [response]}


        except Exception as e:
            logger.error(f"Policy studio evaluation failed: {str(e)}", exc_info=True)
            audit_policy_studio_error(num_scenarios, e, query_preview)
            raise

    
    def parse_studio_results(self, state: State) -> State:
        """
        This node parses the policy studio analysis results and structures them into the required format.
        It takes the analysis from policy_studio node and the original query, then extracts structured data.
        """
        log_node_entry("parse_studio_results")

        user_query = state["user_query"]
        analysis_content = state["messages"][-1].content
       
       

        # Count scenarios for audit
        scenario_matches = re.findall(r'^\d+\.', user_query, re.MULTILINE)
        num_scenarios = len(scenario_matches) if scenario_matches else 1

        logger.info(f"Parsing policy studio results for {num_scenarios} scenario(s)")

        start_time = time.time()

        try:
            llm_with_structured_output = self.llm.with_structured_output(PolicyTestResults, method="json_schema")
            messages = [
                SystemMessage(content=POLICY_STUDIO_PARSING_PROMPT),
                HumanMessage(content=f"Original Query:\n{user_query}\n\nAnalysis Results:\n{analysis_content}"),
            ]
            response = llm_with_structured_output.invoke(messages)
            
            serialized_results = serialize_pydantic_model(response.results)
            
            # Generate results summary
            results_summary = {}
            for result in serialized_results:
                status = result.get("status", "unknown")
                results_summary[status] = results_summary.get(status, 0) + 1
            
            latency_ms = int((time.time() - start_time) * 1000)
            logger.info(f"Policy studio parsing completed: {latency_ms}ms, results: {results_summary}")
            audit_policy_studio_completed(num_scenarios, results_summary, latency_ms)
            
            return {"policy_test_results": serialized_results}
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Policy studio parsing failed after {latency_ms}ms: {str(e)}", exc_info=True)
            audit_policy_studio_error(num_scenarios, e, user_query[:200] if user_query else None)
            raise
    
    
    def create_employee(self, state: State) -> State:
        """
        This node is called when the user query is about onboarding a new employee.
        It creates the employee record in the database.
        """
        log_node_entry("create_employee")

        user_query = state.get("user_query", "")

        logger.info(f"Create employee: {user_query}")

        messages = [
            SystemMessage(content=CREATE_EMPLOYEE_PROMPT), 
            *state["messages"]
        ]
        

        response = self.llm_with_tools.invoke(messages)

        logger.info(f"Create employee response: {response}")
        
        return {"messages": [response]}

    

    def generate_employee_documents(self, state: State) -> State:
        """
        This node is called when the user query is about generating employee documents.
        It generates the employee documents for the new employee.
        """
        log_node_entry("generate_employee_documents")

        llm = self.llm.with_structured_output(GeneratedDocsOutput, method="json_schema")
        content = state["messages"][-1].content
        user_query = state.get("user_query", "")

        messages = [
            SystemMessage(content=GENERATE_EMPLOYEE_DOCUMENTS_PROMPT),
            HumanMessage(content=f"User Query: {user_query}\n\n{content}"),
        ]

        response = llm.invoke(messages)

        employee_id = response.employee_id
        docs = response.docs

        signed_urls = []

        for doc in docs:
            filename = doc.filename
            content = doc.content_markdown
            signed_url = create_document(employee_id, filename, content)
            if signed_url:
                logger.info(f"Document {filename} created and uploaded for employee {employee_id}")
            else:
                logger.warning(f"Failed to create document {filename} for employee {employee_id}")

            signed_urls.append(signed_url)
        
        return {"signed_urls": signed_urls}
        


    def check_if_write_operation(self, state: State) -> State:
        """
        This is a router method. It checks if the last message in state contains a write operation (INSERT, UPDATE, DELETE, etc.).
        
        Args:
            state: The current state containing the messages list
        
        Returns:
            - END: If the last message is an AIMessage or has no tool calls
            - "hitl_approval": If a write SQL operation is detected
            - "tools_hr": For normal tool execution (read operations)
        """
        log_node_entry("check_if_write_operation")

        last_message = state["messages"][-1] if state.get("messages") else None
        
        log_check_write_operation_message(last_message)

        # If the last message is a ToolMessage indicating rejection, don't route to hitl_approval again
        if isinstance(last_message, ToolMessage):
            rejection_content = str(last_message.content)
            if "rejected by the user" in rejection_content.lower() or "no changes were made" in rejection_content.lower():
                logger.info("check_if_write_operation - Detected rejection ToolMessage, routing to END to prevent loop")
                return END

        # If last message is not an AIMessage, can't have tool calls
        if not isinstance(last_message, AIMessage):
            log_check_write_operation_tool_calls([])
            return END

        calls = extract_tool_calls(last_message)
        if not calls:
            log_check_write_operation_tool_calls(calls)
            return END

        log_check_write_operation_tool_calls(calls)

        # Detect writes (execute_sql/apply_migration/etc.)
        for c in calls:
            name = c.get("name")
            args = c.get("args", {}) or {}
            if name == "execute_sql":
                sql_query = args.get("query", "")
                is_write = is_write_sql(sql_query)
                if is_write:
                    log_check_write_operation_result(name, is_write, sql_query, "hitl_approval")
                    return "hitl_approval"
                else:
                    # Log db_read (best-effort, before actual execution)
                    log_check_write_operation_result(name, is_write, sql_query, "tools_hr")
                    if sql_query:
                        audit_sql_operation(sql_query)
        
        log_check_write_operation_result("", False, "", "tools_hr")
        return "tools_hr"

        

    def process_query(self, state: State) -> State:
        """
        Execute the HR agent's main processing logic.
        
        Processes the user query using the LLM. Enhances the query with:
        
        Args:
            state: The current state containing the user query and the document context(if available)
        
        Returns:
            Updated state with an AIMessage containing the LLM response
        """

        log_node_entry("hr_node (process_query)")

        user_query = state.get("user_query", "")       
        job_title = state.get("job_title", "")
        employee_id = state.get("employee_id", "")
        employee_name = state.get("employee_name", "")
        document_name = state.get("document_name", "")

        # Log the combined input (without document context)
        log_execute_input(user_query, job_title, employee_id, employee_name)
        
        # Check if we have formatted_context from RAG (for combined queries)
        formatted_context = state.get("formatted_context", "")

        # Include job title, employee ID, and employee name in user query context for authorization decisions
        enhanced_query = user_query
        if job_title:
            enhanced_query = f"[User Job Title: {job_title}, Employee ID: {employee_id}, Employee Name: {employee_name}]\n\n{user_query}"
        
        # If document_name is provided, instruct the LLM to use it
        if document_name:
            enhanced_query = f"{enhanced_query}\n\n[IMPORTANT: The user is asking about a specific document named '{document_name}']"
        
        # If we have formatted_context from RAG, include it in the prompt
        if formatted_context:
            enhanced_query = f"{enhanced_query}\n\nDocument Context:\n{formatted_context}"

        
        # Build messages with system prompt and conversation history
        messages = [
            SystemMessage(content=EXECUTION_PROMPT),
            *state["messages"],
            HumanMessage(content=enhanced_query),
        ]

        # Log any existing tool responses in the conversation (from previous steps)
        log_tool_messages(state.get("messages", []), context="process_query (existing tool responses)")

        # Invoke LLM with tools
        response = self.llm_with_tools.invoke(messages)

        # Log tool calls made in this step and the LLM response content
        log_tool_calls(response, context="process_query")
        log_execute_response(response)

        return {"messages": [response], "job_title": job_title}


    def hitl_approval(self, state: State) -> State:
        """
        This node is called when a write operation is detected. 
        It interrupts the flow of the graph, and waits for human approval.
        """
        
        log_node_entry("hitl_approval")
        
        
        last_message = state["messages"][-1]
        employee_name = state.get("employee_name", "")
        user_query = state.get("user_query", "")
        
        # Extract tool calls to log SQL query
        tool_calls = extract_tool_calls(last_message)
        sql_query = ""
        tool_call_id = None
        for call in tool_calls:
            if call.get("name") == "execute_sql":
                sql_query = call.get("args", {}).get("query", "")
                tool_call_id = call.get("id")
                break
        
        log_hitl_approval_request(sql_query)

        messages = [
            SystemMessage(content=HITL_APPROVAL_PROMPT),
            HumanMessage(content=f"Employee Name: {employee_name}\n\nUser Query: {user_query}\n\n{str(tool_calls)}"),
        ]
        
        response = self.llm.invoke(messages)
        
        log_hitl_approval_explanation(response.content)
        
        # Log db_write_proposed
        audit_db_write_proposed(sql_query, tool_call_id, response.content)

        # Pause here and return this payload to FastAPI/client
        decision = interrupt({
            "type": "db_write_approval",
            "explanation": response.content,
        })


        user_feedback = decision.get("user_feedback")
        log_hitl_approval_feedback(user_feedback)

        return { "user_feedback": user_feedback }
    


    async def handle_hitl_approval(self, state: State) -> State:
        """
        This node is called when the user has provided feedback on the write operation.
        It either executes the write operation or doesn't execute it based on the user's feedback.
        """
        log_node_entry("handle_hitl_approval")

        last_message = state["messages"][-1]
        user_feedback = state["user_feedback"]
        
        log_handle_hitl_approval_start(user_feedback)

        # Extract the original tool_call (id, name, args) from the last AIMessage
        tool_call_id, tool_name, tool_args = extract_tool_call(last_message)
        
        # get the sql query from the tool args
        sql_query = tool_args.get("query", "")


        log_handle_hitl_approval_tool_extraction(tool_call_id, tool_name, sql_query)

        approved = False

        if user_feedback.lower() == "approved":
            approved = True
        elif user_feedback.lower() == "rejected":
            approved = False
        
        
        log_handle_hitl_approval_decision(approved)
        
        # Log db_write_decision
        audit_db_write_decision(tool_call_id, approved, user_feedback)

        # NOTE: execute_sql must return a ToolMessage with the SAME tool_call_id as the original tool_use.
        if approved:
            # Execute the SQL query using the execute_sql tool (index 0)
            execute_sql_tool = self.tools[0]  # adjust if your tool order differs

            try:
                tool_result = await execute_sql_tool.ainvoke({"query": sql_query})
                
                log_handle_hitl_approval_execution(sql_query, True, str(tool_result))
                
                # Log db_write_executed (success)
                audit_db_write_executed_success(tool_call_id, sql_query, tool_result)
                
                tool_message = ToolMessage(
                    content=str(tool_result),
                    tool_call_id=tool_call_id,   # <-- must match original tool call id
                    name=tool_name or "execute_sql",
                )

                return {"messages": [tool_message]}

            except Exception as e:
                error_message = f"Error executing SQL query: {type(e).__name__}: {e}"
                log_handle_hitl_approval_execution(sql_query, False, None, error_message)
                
                # Log db_write_executed (error)
                audit_db_write_executed_error(tool_call_id, sql_query, e)

                # Still return a ToolMessage matching the same tool_call_id
                # so the next LLM call doesn't crash due to missing tool_result.
                tool_message = ToolMessage(
                    content=error_message,
                    tool_call_id=tool_call_id,
                    name=tool_name or "execute_sql",
                )
                return {"messages": [tool_message]}

        else:
            log_handle_hitl_approval_rejection()
            
            # Log db_write_executed (blocked)
            audit_db_write_executed_blocked(tool_call_id, sql_query)
            
            # User rejected the operation -> MUST still return a ToolMessage for that tool_call_id
            tool_message = ToolMessage(
                content="Query was rejected by the user. No changes were made.",
                tool_call_id=tool_call_id,
                name=tool_name or "execute_sql",
            )
            return {"messages": [tool_message]}


    def format_result_for_voice(self, state: State) -> State:
        """
        This node is called when the user query is a voice query.
        It formats the result of the user query for voice output.
        """
        log_node_entry("format_result_for_voice")

        last_message = state["messages"][-1].content
        detected_language = state.get("language_detected", "en")

        messages = [
            SystemMessage(content=FORMAT_RESULT_FOR_VOICE_PROMPT),
            HumanMessage(content=f"Original text: {last_message}\nDetected language: {detected_language}"),
        ]
        response = self.llm.invoke(messages)

        result = response.content

        logger.info(f"Formatted result for voice: {result}")

        return {"result_for_voice": result}

    
    def route_from_finalize(self, state: State) -> State:

        if state.get("voice_query"):
            return "format_result_for_voice"
        else:
            return END

    def finalize(self, state: State) -> State:
        """
         This node is called when the user query is processed.
         It's a dummy node that just returns the state, used as an anchor to determine the next node to execute.
        """
        return state
