"""
MCP tools for interacting with Supabase MCP server (persistent session).
"""

import asyncio
import json
import logging
import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from langchain_core.tools import BaseTool
from langgraph.prebuilt import ToolNode

from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools  # important for persistent session tools

load_dotenv(".env.local")

logger = logging.getLogger(__name__)

# Optional: reduce noisy logs. Keep at WARNING so real issues still show up.
logging.getLogger("mcp").setLevel(logging.WARNING)
logging.getLogger("langchain_mcp_adapters").setLevel(logging.WARNING)


# -----------------------------
# Module-level cached state
# -----------------------------
# Leading underscore = "internal/private to this module" convention.
_client: Optional[MultiServerMCPClient] = None

# Async context manager returned by: _client.session("supabase")
# We keep it so we can call __aexit__ later on shutdown.
_session_cm: Any = None

# The live, active MCP session object (created by __aenter__()).
_session: Any = None

# Tools loaded from the session (cached).
_tools: Optional[List[BaseTool]] = None

# ToolNode created from the tools (cached).
_tool_node: Optional[ToolNode] = None

# Lock to protect init/shutdown in concurrent environments (FastAPI, async servers).
_init_lock = asyncio.Lock()


def load_mcp_servers(config_path: str = "./mcp.json") -> Dict[str, Any]:
    """
    Load MCP server definitions from a JSON config file.
    Expects a top-level 'mcpServers' dict in the config.

    Also injects Authorization header for supabase server entries:
    - Prefer SUPABASE_ACCESS_TOKEN (PAT)
    - Fall back to existing config Authorization header (if present)
    - Finally fall back to SUPABASE_ANON_KEY (last resort; usually not enough for hosted MCP)
    """
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"MCP config file not found: {config_path}")

    with open(config_path, "r") as f:
        config = json.load(f)

    servers = config.get("mcpServers", {})

    supabase_anon = os.getenv("SUPABASE_ANON_KEY")
    supabase_pat = os.getenv("SUPABASE_ACCESS_TOKEN")

    for name, server in servers.items():
        # If server uses a local command, default to stdio transport.
        if "command" in server and "transport" not in server:
            server["transport"] = "stdio"

        # If server uses a URL, default to streamable_http transport.
        if "url" in server and "transport" not in server:
            server["transport"] = "streamable_http"

        # Add headers if this is an HTTP-based MCP server.
        if "url" in server:
            server.setdefault("headers", {})

            # Only inject auth for supabase entries
            if "supabase" in name.lower():
                if supabase_pat:
                    # Best: your Supabase PAT / access token
                    server["headers"]["Authorization"] = f"Bearer {supabase_pat}"
                else:
                    # If user already put Authorization in mcp.json, normalize it.
                    existing = server["headers"].get("Authorization", "")
                    if existing and not existing.startswith("Bearer "):
                        server["headers"]["Authorization"] = f"Bearer {existing}"
                    elif not existing and supabase_anon:
                        # Last resort—often insufficient for hosted MCP
                        server["headers"]["Authorization"] = f"Bearer {supabase_anon}"

    return servers


async def init_mcp(server_name: str = "supabase") -> None:
    """
    Initialize MCP once per process:
    - Create MultiServerMCPClient
    - Open a persistent session to the given server_name
    - Load tools from that session
    - Build a ToolNode from those tools

    This is the key change vs calling client.get_tools(), which typically results in
    a fresh session per tool call.
    """
    global _client, _session_cm, _session, _tools, _tool_node

    async with _init_lock:
        # Already initialized -> nothing to do
        if _tool_node is not None:
            return

        mcp_servers = load_mcp_servers()
        _client = MultiServerMCPClient(mcp_servers)

        # Open a single long-lived session and keep it open.
        _session_cm = _client.session(server_name)
        _session = await _session_cm.__aenter__()

        # Load tools bound to the persistent session.
        # These tool wrappers will reuse the same session during execution.
        _tools = await load_mcp_tools(_session)

        # ToolNode is what LangGraph uses to execute tool calls.
        _tool_node = ToolNode(_tools)

        logger.info("MCP initialized with persistent session (server=%s)", server_name)


async def shutdown_mcp() -> None:
    """
    Close the persistent MCP session and clear caches.
    Call once at application shutdown.
    """
    global _client, _session_cm, _session, _tools, _tool_node

    async with _init_lock:
        # If we opened a session context manager, close it.
        if _session_cm is not None:
            try:
                await _session_cm.__aexit__(None, None, None)
            finally:
                _session_cm = None
                _session = None

        # Drop cached tools/nodes/client references
        _tool_node = None
        _tools = None
        _client = None

        logger.info("MCP shutdown complete")


async def get_mcp_tools() -> List[BaseTool]:
    """
    Get cached tools; lazily initializes MCP if needed.
    Use this if you need the tool list directly.
    """
    if _tools is None:
        await init_mcp()
    return _tools  # type: ignore[return-value]


async def get_mcp_tool_node() -> ToolNode:
    """
    Get cached ToolNode; lazily initializes MCP if needed.
    This is usually what you want for LangGraph graphs.
    """
    if _tool_node is None:
        await init_mcp()
    return _tool_node
