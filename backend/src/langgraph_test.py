import asyncio
import os
from dotenv import load_dotenv, find_dotenv
from langchain_groq import ChatGroq
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from src.core.mcp.supabase import get_mcp_tool_node
from src.agents.db_agent.graphbuilder import DB_Agent_GraphBuilder


# The code below is for the Langsmith/LangGraph studio
load_dotenv('.env.local')

groq_api_key = os.getenv("GROQ_API_KEY")
claude_api_key = os.getenv("CLAUDE_API_KEY")
openai_api_key = os.getenv("OPENAI_API_KEY")

#llm = ChatAnthropic(model="claude-sonnet-4-5-20250929", api_key=claude_api_key)
llm = ChatGroq(model="openai/gpt-oss-120b", api_key=groq_api_key)
#llm = ChatOpenAI(model="gpt-5", api_key=openai_api_key)


async def build_graph():
    """Build the graph asynchronously."""
    tool_node = await get_mcp_tool_node()
    graph_builder = DB_Agent_GraphBuilder(llm, tool_node)
    return graph_builder.build_graph()


# Build the graph using asyncio.run()
graph = asyncio.run(build_graph())