import os
from langchain_groq import ChatGroq
from dotenv import load_dotenv
from src.tools import get_mcp_tools
from src.state import State
from langchain_core.messages import SystemMessage, HumanMessage
from src.prompts import *

load_dotenv('.env.local')


class HR_Node:
    def __init__(self, llm):
        self.llm = llm 
 
    

    async def execute(self, state: State) -> State:
        user_query = state["messages"][-1].content
        
        # Get actual tools (async function that uses cached tools)
        tools = await get_mcp_tools()
        llm_with_tools = self.llm.bind_tools(tools)
        
        # Build messages with system prompt and conversation history
        messages = [
            SystemMessage(content=PROMPT),
            HumanMessage(content=user_query),
            *state["messages"]
        ]
          
        # Use ainvoke for async execution (required when graph uses ainvoke)
        response = await llm_with_tools.ainvoke(messages)
        
        return {"messages": [response], "user_query": user_query}