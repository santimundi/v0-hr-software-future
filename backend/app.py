import os
import logging
import uvicorn
import time
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
from langgraph.types import Command
from src.hr_agent.graphbuilder import HR_Agent_GraphBuilder
from src.services.main import DocumentService

# MCP helpers
from src.core.mcp.supabase import *

# Audit logging
from src.hr_agent.audit import (
    new_request_id,
    request_id_var, thread_id_var, actor_var, interrupt_id_var,
)
from src.hr_agent.audit_helpers import *

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
    all_tools = await get_mcp_tools()
    
    # Filter to only include 'execute_sql' and 'list_tables' tools
    # Sort by name to ensure consistent ordering: 'execute_sql' will be index 0, 'list_tables' will be index 1
    tools = sorted(
        [tool for tool in all_tools if tool.name in ['execute_sql', 'list_tables']],
        key=lambda t: t.name
    )
    logger.info(f"Filtered MCP tools: {[tool.name for tool in tools]}")

    app.state.document_service = DocumentService()

    app.state.hr_graph = HR_Agent_GraphBuilder(llm = llm, tools=tools).build_graph()

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
    - This endpoint is also used to provide feedback to the grapg when an interrupt is triggered
    """
    
    # Generate request ID and set context variables
    request_id = new_request_id()
    request_id_var.set(request_id)
    start_time = time.time()
    
    data = await request.json()

    employee_id = data.get("employee_id", "")
    thread_id_var.set(employee_id)
    config = {"configurable": {"thread_id": employee_id}}

    # Set actor information in context (matching audit spec structure)
    employee_name = data.get("employee_name", "")
    job_title = data.get("job_title", "")
    role = data.get("role", "employee")  # Default to "employee" if not provided
    actor_info = {
        "employee_id": employee_id,
        "display_name": employee_name,  # Use display_name per spec
        "job_title": job_title,
        "role": role,
    }
    actor_var.set(actor_info)

    graph = app.state.hr_graph

    # 1) RESUME PATH (user provided feedback)
    if "resume" in data:
        # Log resume request (without sensitive text)
        audit_hitl_resume_received(data.get("resume", {}))
        
        result = await graph.ainvoke(Command(resume=data["resume"]), config=config)

    # 2) NEW RUN PATH
    else:
        query = data.get("query", "")
        document_name = data.get("document_name", "")
        selected_scopes = data.get("selected_scopes", ["all"])
        
        # Get client info
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Log request received
        audit_request_received(query, selected_scopes, client_ip, user_agent)

        result = await graph.ainvoke(
            {
                "messages": [HumanMessage(content=query)],
                "user_query": query,
                "employee_id": employee_id,
                "employee_name": employee_name,
                "job_title": job_title,
                "document_name": document_name,
            },
            config=config,
        )

    # Calculate response time
    response_time_ms = int((time.time() - start_time) * 1000)

    # If graph is paused for HITL, return that to frontend
    if "__interrupt__" in result and result["__interrupt__"]:
        # result["__interrupt__"] is often a list of Interrupt objects; payload is in .value
        interrupts = []
        interrupt_types = []
        for it in result["__interrupt__"]:
            interrupt_value = getattr(it, "value", it)
            interrupts.append(interrupt_value)
            if isinstance(interrupt_value, dict):
                interrupt_types.append(interrupt_value.get("type", "unknown"))
        
        # Set interrupt_id if available
        if interrupts and isinstance(interrupts[0], dict):
            interrupt_id = interrupts[0].get("id") or new_request_id()
            interrupt_id_var.set(interrupt_id)
        
        # Log response sent (interrupt)
        audit_response_sent(
            "interrupt",
            response_time_ms=response_time_ms,
            model_provider="groq",  # TODO: Get from actual LLM config
            model_name="openai/gpt-oss-120b"
        )
        
        return {
            "type": "interrupt",
            "interrupts": interrupts,
        }

    # Otherwise normal completion
    msg = result["messages"][-1].content if result.get("messages") else ""
    msg_preview = str(msg)[:200] if msg else None  # Preview first 200 chars
    
    # Log response sent (final)
    audit_response_sent(
        "final",
        message_preview=msg_preview,
        actions_emitted=[],
        response_time_ms=response_time_ms,
        model_provider="groq",  # TODO: Get from actual LLM config
        model_name="openai/gpt-oss-120b"
    )
    
    return {"type": "final", "data": msg}



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
