"""
Test script for MCP Supabase server using LangChain MCP adapters
Tests the available tools and their functionality
"""
import asyncio
import json
import os
from dotenv import load_dotenv
from langchain_mcp_adapters.client import MultiServerMCPClient

load_dotenv('.env.local')

def load_mcp_servers(config_path):
    """Load MCP server definitions from a JSON config file.
    Expects a top-level 'mcpServers' dict in the config.
    """
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"MCP config file not found: {config_path}")
    
    with open(config_path, "r") as f:
        config = json.load(f)
    
    servers = config.get("mcpServers", {})
    
    # Get authentication credentials from environment (for fallback)
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    supabase_pat = os.getenv("SUPABASE_ACCESS_TOKEN")
    
    # Optionally add default transports if missing and add authentication
    for name, server in servers.items():
        if "command" in server and "transport" not in server:
            server["transport"] = "stdio"
        if "url" in server and "transport" not in server:
            server["transport"] = "streamable_http"
        
        if "url" in server:
            if "headers" not in server:
                server["headers"] = {}
            
            # For Supabase MCP server, prioritize token from .env.local
            if "supabase" in name.lower():
                existing_auth = server.get("headers", {}).get("Authorization", "")
                
                if supabase_pat:
                    server["headers"]["Authorization"] = f"Bearer {supabase_pat}"
                elif existing_auth:
                    if not existing_auth.startswith("Bearer "):
                        server["headers"]["Authorization"] = f"Bearer {existing_auth}"
                elif supabase_key:
                    server["headers"]["Authorization"] = f"Bearer {supabase_key}"
    
    return servers

async def test_mcp_tools():
    """Test MCP server tools using LangChain MCP adapters"""
    
    print("Testing MCP Supabase Server...\n")
    
    mcp_servers = load_mcp_servers("./src/core/mcp/mcp.json")
    client = MultiServerMCPClient(mcp_servers)
    mcp_tools = await client.get_tools()
    
    print(f"✅ Connected! Found {len(mcp_tools)} tool(s):\n")
    
    for i, tool in enumerate(mcp_tools, 1):
        print(f"{i}. {tool.name}")
        if hasattr(tool, 'description') and tool.description:
            print(f"   Description: {tool.description}")
        if hasattr(tool, 'args_schema') and tool.args_schema:
            print(f"   Parameters: {tool.args_schema}")
        print()

if __name__ == "__main__":
    asyncio.run(test_mcp_tools())
