import os
import uvicorn
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage

from src.agents.db_agent.graphbuilder import DB_Agent_GraphBuilder
from src.agents.hr_agent.graphbuilder import HR_Agent_GraphBuilder

# MCP helpers
from src.core.mcp.supabase import init_mcp, shutdown_mcp, get_mcp_tool_node, get_mcp_tools

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
    llm_with_tools = llm.bind_tools(tools[:10])
    app.state.hr_graph = HR_Agent_GraphBuilder(llm_with_tools, tool_node=tool_node).build_graph()
    app.state.db_graph = DB_Agent_GraphBuilder(llm_with_tools, tool_node=tool_node).build_graph()
    
    yield  # App runs here
    
    # Shutdown: Cleanup MCP session
    await shutdown_mcp()

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

    if not employee_id:
        return {"error": "employee_id is required"}

    # Reuse the cached graph (DO NOT rebuild per request)
    graph = app.state.hr_graph

    # LangGraph config (thread_id uses employee_id for per-employee conversation memory)
    config = {"configurable": {"thread_id": employee_id}}

    # Run the graph asynchronously.
    response = await graph.ainvoke(
        {"messages": [HumanMessage(content=query)], "employee_id": employee_id, "employee_name": employee_name, "job_title": job_title},
        config=config,
    )

    # Return final assistant message content
    return {"data": response["messages"][-1].content}


@app.post("/upload_file")
async def upload_file(request: Request):
    """
    Upload a file to the database storage.
    """
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

    graph = app.state.db_graph

    config = {"configurable": {"thread_id": employee_id}}

    response = await graph.ainvoke(
        {
            "messages": [HumanMessage(content=f"Upload file: {filename}")],
            "employee_id": employee_id,
            "employee_name": employee_name,
            "filename": filename,
            "file_bytes": file_bytes,
        },
        config=config,
    )


    # Extract the response from the graph state
    # The response should be in the state dictionary under the "response" key
    graph_response = None
    if isinstance(response, dict):
        graph_response = response.get("response")
        
        # If response is None or empty, check if it's a dict with status_code
        if not graph_response or (isinstance(graph_response, dict) and not graph_response.get("status_code")):
            # Check if response key exists but is None/empty - might be a successful insert without explicit response
            # Check messages for clues
            messages = response.get("messages", [])
            if messages:
                last_message = messages[-1] if messages else None
                if hasattr(last_message, 'content'):
                    content = last_message.content
                    # If message indicates success, return success response
                    if "inserted" in content.lower() or "success" in content.lower():
                        graph_response = {"status_code": 200, "message": content}
    
    if graph_response and isinstance(graph_response, dict) and graph_response.get("status_code"):
        return {"response": graph_response}
    else:
        # If no valid response in state, return error
        error_msg = "Unknown error - no response from graph"
        if isinstance(response, dict):
            messages = response.get("messages", [])
            if messages:
                last_message = messages[-1] if messages else None
                if hasattr(last_message, 'content'):
                    error_msg = last_message.content
        
        return {"response": {"status_code": 500, "message": error_msg}}


# -----------------------------
# Local dev entrypoint
# -----------------------------
if __name__ == "__main__":

    # Run FastAPI server
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
