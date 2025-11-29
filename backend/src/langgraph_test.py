import asyncio
import os
from dotenv import load_dotenv, find_dotenv
from langchain_groq import ChatGroq
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from src.core.mcp.supabase import get_mcp_tool_node, init_mcp, get_mcp_tools
from src.agents.hr_agent.graphbuilder import HR_Agent_GraphBuilder
from src.agents.rag_agent.graphbuilder import RAG_Agent_GraphBuilder
from src.core.mcp.tools_node import supabase_tools_node


# The code below is for the Langsmith/LangGraph studio
load_dotenv('.env.local')

groq_api_key = os.getenv("GROQ_API_KEY")
claude_api_key = os.getenv("CLAUDE_API_KEY")
openai_api_key = os.getenv("OPENAI_API_KEY")

#llm = ChatAnthropic(model="claude-sonnet-4-5-20250929", api_key=claude_api_key)
llm = ChatGroq(model="openai/gpt-oss-120b", api_key=groq_api_key)
#llm = ChatOpenAI(model="gpt-5", api_key=openai_api_key)

# Build graphs synchronously (NO asyncio.run here)
rag_graph = RAG_Agent_GraphBuilder(
    llm=llm,
    tool_node=supabase_tools_node,
).build_graph()

graph = HR_Agent_GraphBuilder(
    llm=llm,
    tool_node=supabase_tools_node,
    rag_graph=rag_graph,
).build_graph()