import logging
import re
import json
from src.hr_agent.tools import get_document_context
from src.hr_agent.state import State, RouteQueryOutput
from src.hr_agent.logging_utils import *
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage, ToolMessage
from src.hr_agent.prompts import EXECUTION_PROMPT, ROUTE_QUERY_PROMPT, GET_CONTEXT_PROMPT

logger = logging.getLogger(__name__)



class HR_Node:
    def __init__(self, llm, tools):
        self.llm = llm
        self.llm_with_tools = llm.bind_tools(tools)
      
 
    
    def route_query(self, state: State) -> State:
        log_node_entry("route_query")
        
        user_query = state["user_query"]
        provided_document_name = state.get("document_name", "")
        
        # Build context for the LLM
        query_context = user_query
        if provided_document_name:
            query_context = f"User Query: {user_query}\n\nDocument Name Provided: {provided_document_name}"
        

        messages = [
            SystemMessage(content=ROUTE_QUERY_PROMPT),
            HumanMessage(content=query_context),
        ]

        llm_with_structured_output = self.llm.with_structured_output(RouteQueryOutput)
        response = llm_with_structured_output.invoke(messages)
        
        # Log the LLM routing decision
        log_routing_decision(response.rag, response.document_name, response.rag_query, response.agent_query)

        return {
            "messages": [AIMessage(content=f"RAG: {response.rag}, Document: {response.document_name}".rstrip())],
            "rag": response.rag,
            "document_name": response.document_name or "",
            "user_query": user_query,
            "rag_query": response.rag_query or "",
            "agent_query": response.agent_query or "",
        }

    
    
    def route_input(self, state: State) -> State:
        log_node_entry("route_input")
        rag_needed = state.get("rag", False)
        destination = "get_context" if rag_needed else "hr_node"
        logger.info(f"Routing to: {destination} (rag_needed={rag_needed})")
        return destination
    
    

   
    def get_context(self, state: State) -> State:
        log_node_entry("get_context")

        document_name = state["document_name"]
        employee_id = state["employee_id"]

        messages = [
            SystemMessage(content=GET_CONTEXT_PROMPT),
            HumanMessage(content=f"Document Name: {document_name}, Employee ID: {employee_id}"),
            *state["messages"],
        ]
        

        llm = self.llm.bind_tools([get_document_context])
        response = llm.invoke(messages)

        # Log all tool calls from the response
        log_get_context_tool_calls(response)

        # Log all tool messages (tool results) from state
        tool_messages = [msg for msg in state["messages"] if isinstance(msg, ToolMessage)]
        log_get_context_tool_results(tool_messages)

        # Find and log the last tool call result containing document information
        log_last_tool_result_for_extraction(tool_messages)

        return {"messages": [response]}

         
    
    def execute(self, state: State) -> State:
        log_node_entry("hr_node (execute)")

        # Use agent_query if available (refined query), otherwise fall back to user_query
        agent_query = state.get("agent_query", "")
        user_query = state.get("user_query", "")
        query_to_use = agent_query if agent_query else user_query
        
        job_title = state.get("job_title", "")
        employee_id = state.get("employee_id", "")
        employee_name = state.get("employee_name", "")
        
        # Check if we have formatted_context from RAG (for combined queries)
        formatted_context = state.get("formatted_context", "")
        
        # Include job title, employee ID, and employee name in user query context for authorization decisions
        enhanced_query = query_to_use
        if job_title:
            enhanced_query = f"[User Job Title: {job_title}, Employee ID: {employee_id}, Employee Name: {employee_name}]\n\n{query_to_use}"
        
        # If we have formatted_context from RAG, include it in the prompt
        if formatted_context:
            enhanced_query = f"{enhanced_query}\n\nDocument Context:\n{formatted_context}"

        # Build messages with system prompt and conversation history
        messages = [
            SystemMessage(content=EXECUTION_PROMPT),
            HumanMessage(content=enhanced_query),
            *state["messages"]
        ]
          
        
        response = self.llm_with_tools.invoke(messages)
        
        # Log the LLM response
        log_execute_response(response)

        return {"messages": [response], "job_title": job_title}


