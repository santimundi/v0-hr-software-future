import os
import uvicorn
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

from src.graphbuilder import GraphBuilder

# Persistent-session MCP helpers (from the refined MCP module you created)
from src.tools import init_mcp, shutdown_mcp, get_mcp_tool_node

# Load environment variables (GROQ key, SUPABASE PAT, etc.)
load_dotenv(".env.local")


# We create the LLM once per process; no need to recreate it per request.
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
    app.state.graph = GraphBuilder(llm, tool_node=tool_node).build_graph()
    
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
    - Read query and user_id
    - Reuse the cached graph (built at startup)
    - Invoke graph asynchronously (required for async MCP tools)
    """
    
    # Extract JSON payload
    data = await request.json()
    query = data.get("query", "")
    user_id = data.get("user_id", "")

    # Reuse the cached graph (DO NOT rebuild per request)
    graph = app.state.graph

    # LangGraph config (thread_id commonly used for per-user/per-conversation memory)
    config = {"configurable": {"thread_id": user_id}}

    # Run the graph asynchronously.
    response = await graph.ainvoke(
        {"messages": [HumanMessage(content=query)], "user_id": user_id},
        config=config,
    )

    # Return final assistant message content
    return {"data": response["messages"][-1].content}


# -----------------------------
# Local dev entrypoint
# -----------------------------
if __name__ == "__main__":

    # Run FastAPI server
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
