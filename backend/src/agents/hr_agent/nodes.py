import os
from dotenv import load_dotenv
from src.core.mcp.supabase import get_mcp_tools
from src.agents.hr_agent.state import State
from langchain_core.messages import SystemMessage, HumanMessage
from src.agents.hr_agent.prompts import PROMPT

load_dotenv('.env.local')


class HR_Node:
    def __init__(self, llm):
        self.llm = llm 
 
    
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
            SystemMessage(content=PROMPT),
            HumanMessage(content=enhanced_query),
            *state["messages"]
        ]
          
        # Use ainvoke for async execution (required when graph uses ainvoke)
        response = await llm_with_tools.ainvoke(messages)
        
        return {"messages": [response], "user_query": user_query, "job_title": job_title}