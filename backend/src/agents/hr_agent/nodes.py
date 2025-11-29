import os
import logging
from dotenv import load_dotenv
from src.agents.rag_agent.graphbuilder import RAG_Agent_GraphBuilder
from src.core.mcp.supabase import get_mcp_tools
from src.agents.hr_agent.state import State, RouteQueryOutput
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage
from src.agents.hr_agent.prompts import EXECUTION_PROMPT, ROUTE_QUERY_PROMPT

load_dotenv('.env.local')

logger = logging.getLogger(__name__)


class HR_Node:
    def __init__(self, llm, rag_graph):
        self.llm = llm 
        self.rag_graph = rag_graph
 
    
    def route_query(self, state: State) -> State:
        user_query = state["user_query"]
        document_name = state["document_name"]
        enhanced_query = user_query + f" Document Name: {document_name}"
        
        llm_with_structured_output = self.llm.with_structured_output(RouteQueryOutput)

        messages = [
            SystemMessage(content=ROUTE_QUERY_PROMPT),
            HumanMessage(content=enhanced_query),
        ]

        response = llm_with_structured_output.invoke(messages)
        
        # Log the LLM routing decision
        logger.info(f"Route query decision: {response.decision}, Document name: {response.document_name}")

        return {
            "messages": [AIMessage(content=f"Decision: {response.decision}")],
            "decision": response.decision,
            "document_name": response.document_name,
            "user_query": enhanced_query,
        }

    
    def route_input(self, state: State) -> State:

        decision = state["decision"]

        if decision == "rag":
            return "rag_node"

        elif decision == "agent":
            return "hr_node"


    async def execute(self, state: State) -> State:
        user_query = state["messages"][-1].content
        job_title = state.get("job_title", "")
        employee_id = state.get("employee_id", "")
        employee_name = state.get("employee_name", "")
        
        
        # Get actual tools (async function that uses cached tools)
        tools = await get_mcp_tools()
        llm_with_tools = self.llm.bind_tools(tools)
        
        # Include job title, employee ID, and employee name in user query context for authorization decisions
        enhanced_query = user_query
        if job_title:
            enhanced_query = f"[User Job Title: {job_title}, Employee ID: {employee_id}, Employee Name: {employee_name}]\n\n{user_query}"
        
        # Build messages with system prompt and conversation history
        messages = [
            SystemMessage(content=EXECUTION_PROMPT),
            HumanMessage(content=enhanced_query),
            *state["messages"]
        ]
          
        
        response = await llm_with_tools.ainvoke(messages)
        
        # Log the LLM response
        response_content = response.content if hasattr(response, 'content') else str(response)
        logger.info(f"HR Agent execute response (first 500 chars): {response_content[:500]}")
        
        return {"messages": [response], "job_title": job_title}


