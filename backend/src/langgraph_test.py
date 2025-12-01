import asyncio
import os
from dotenv import load_dotenv, find_dotenv
from langchain_groq import ChatGroq
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from src.core.mcp.supabase import get_mcp_tools_sync
from src.agents.hr_agent.graphbuilder import HR_Agent_GraphBuilder


# The code below is for the Langsmith/LangGraph studio
load_dotenv('.env.local')

groq_api_key = os.getenv("GROQ_API_KEY")
claude_api_key = os.getenv("CLAUDE_API_KEY")
openai_api_key = os.getenv("OPENAI_API_KEY")

#llm = ChatAnthropic(model="claude-sonnet-4-5-20250929", api_key=claude_api_key)
llm = ChatGroq(model="openai/gpt-oss-120b", api_key=groq_api_key)
#llm = ChatOpenAI(model="gpt-5", api_key=openai_api_key)


tools = get_mcp_tools_sync()

graph = HR_Agent_GraphBuilder(llm=llm, tools=tools).build_graph()
