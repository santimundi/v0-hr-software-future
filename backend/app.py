import os
import logging
import uvicorn
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv

# Set up logging FIRST, before any other imports that might use logging
from logging_config import setup_logging
setup_logging()

logger = logging.getLogger(__name__)
from langchain_groq import ChatGroq
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage

from src.agents.rag_agent.graphbuilder import RAG_Agent_GraphBuilder
from src.agents.hr_agent.graphbuilder import HR_Agent_GraphBuilder
from src.services.main import DocumentService

# MCP helpers
from src.core.mcp.supabase import *

# Load environment variables (GROQ key, SUPABASE PAT, etc.)
load_dotenv(".env.local")


# We create the LLM once per process; no need to recreate it per request.
# llm = ChatAnthropic(
#     model="claude-sonnet-4-5-20250929",
#     api_key=os.getenv("CLAUDE_API_KEY"),
# )
llm = ChatGroq(
   model="openai/gpt-oss-120b",
   api_key=os.getenv("GROQ_API_KEY"),
)

# -----------------------------
# App lifecycle (lifespan context manager)
# -----------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI app lifecycle.
    
    Startup (before yield):
    - Open ONE persistent MCP session to Supabase MCP (fast tool calls)
    - Load MCP tools bound to that session
    - Build the LangGraph graph ONCE and cache it
    
    This avoids:
    - Rebuilding the graph on every /query request
    - Re-discovering tools repeatedly
    - Opening/closing MCP sessions repeatedly per tool call
    
    Shutdown (after yield):
    - Close the persistent MCP session
    """
    # Startup: Initialize MCP and build graph
    await init_mcp(server_name="supabase")
    tool_node = await get_mcp_tool_node()
    tools = await get_mcp_tools()
    llm_with_tools = llm.bind_tools(tools)

    app.state.document_service = DocumentService()
    # RAG agent needs base LLM (without tools) for structured output, but also needs tools for database queries
    app.state.rag_graph = RAG_Agent_GraphBuilder(llm=llm_with_tools, tool_node=tool_node, base_llm=llm).build_graph()

    app.state.hr_graph = HR_Agent_GraphBuilder(llm_with_tools, tool_node=tool_node, rag_graph=app.state.rag_graph).build_graph()

    yield  # App runs here
    
    # Shutdown: Cleanup MCP session
    try:
        await shutdown_mcp()
    except Exception as e:
        # Suppress shutdown errors - these are cleanup issues and don't affect functionality
        logger.warning(f"Non-critical error during MCP shutdown: {type(e).__name__}: {e}")

# -----------------------------
# FastAPI app setup
# -----------------------------
app = FastAPI(lifespan=lifespan)

# Allow your Next.js frontend (localhost:3000) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# API endpoint
# -----------------------------
@app.post("/query")
async def answer_query(request: Request):
    """
    Main endpoint called by the frontend.

    Per request:
    - Read query and employee_id
    - Reuse the cached graph (built at startup)
    - Invoke graph asynchronously (required for async MCP tools)
    """
    
    # Extract JSON payload
    data = await request.json()
    query = data.get("query", "")
    employee_id = data.get("employee_id", "")
    employee_name = data.get("employee_name", "")
    job_title = data.get("job_title", "")
    document_name = data.get("document_name", "")
    
    # Add separator for new request
    logger.info("-" * 80)
    logger.info(f"NEW REQUEST - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("-" * 80)
    
    # Log the received payload
    logger.info(f"Received /query request - Employee ID: {employee_id}, Employee Name: {employee_name}, Job Title: {job_title}, Document Name: {document_name}, Query: {query}")


    # Reuse the cached graph (DO NOT rebuild per request)
    graph = app.state.hr_graph

    # LangGraph config (thread_id uses employee_id for per-employee conversation memory)
    config = {"configurable": {"thread_id": employee_id}}

    # Run the graph asynchronously.
    response = await graph.ainvoke(
        {
            "messages": [HumanMessage(content=query)], 
            "user_query": query,
            "employee_id": employee_id, 
            "employee_name": employee_name, 
            "job_title": job_title, 
            "document_name": document_name
        },
        config=config,
    )

    # Log request completion
    response_content = response["messages"][-1].content
    logger.info(f"Request completed - Response length: {len(response_content)} characters")
    logger.info("-" * 80)
    
    # Return final assistant message content
    return {"data": response_content}


@app.post("/upload_file")
async def upload_file(request: Request):
    """
    Upload a file to the database storage and update the database with the file information.
    """
    # Extract JSON payload
    data = await request.json()
    employee_id = data.get("employee_id", "")
    employee_name = data.get("employee_name", "")
    filename = data.get("filename", "")
    file_bytes_array = data.get("file_bytes", [])

    # Convert array of bytes (0-255) back to actual bytes object
    if isinstance(file_bytes_array, list):
        file_bytes = bytes(file_bytes_array)
    else:
        file_bytes = file_bytes_array if isinstance(file_bytes_array, bytes) else b""
    
    # Get document service instance
    document_service = app.state.document_service
    
    # Process document upload
    result = await document_service.process_document_upload(
        employee_id=employee_id,
        employee_name=employee_name,
        filename=filename,
        file_bytes=file_bytes
    )
    
    # Return response in the expected format
    return {
        "response": {
            "status_code": result.get("status_code", 500),
            "message": result.get("message", "Unknown error")
        }
    }


# -----------------------------
# Local dev entrypoint
# -----------------------------
if __name__ == "__main__":

    # Run FastAPI server
    # Uvicorn startup/shutdown messages will show in console
    # Application logs go to files only
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000, 
        reload=False
    )
