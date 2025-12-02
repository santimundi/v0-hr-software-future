/**
 * MCP client for interacting with Supabase MCP server (persistent session).
 * Maps from Python src/core/mcp/supabase.py to TypeScript
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Module-level cached state (equivalent to Python globals)
let _client: MultiServerMCPClient | null = null;
let _tools: StructuredToolInterface[] | null = null;
let _toolNode: ToolNode | null = null;
let _initLock = false;

/**
 * Load MCP server definitions from a JSON config file.
 * Maps from Python load_mcp_servers function
 */
function loadMcpServers(configPath: string = "mcp.json"): Record<string, any> {
  // Look for mcp.json in the same directory as this file
  const fullPath = path.resolve(__dirname, configPath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`MCP config file not found: ${fullPath}`);
  }

  const config = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  const servers = config.mcpServers || {};

  const supabaseAnon = process.env.SUPABASE_ANON_KEY;
  const supabasePat = process.env.SUPABASE_ACCESS_TOKEN;

  for (const [name, server] of Object.entries(servers)) {
    const serverConfig = server as any;

    // If server uses a local command, default to stdio transport
    if (serverConfig.command && !serverConfig.transport) {
      serverConfig.transport = "stdio";
    }

    // If server uses a URL, default to http transport
    // JavaScript MCP adapters use "http" or "sse", not "streamable_http"
    if (serverConfig.url && !serverConfig.transport) {
      serverConfig.transport = "http";
    }

    // Add headers if this is an HTTP-based MCP server
    if (serverConfig.url) {
      if (!serverConfig.headers) {
        serverConfig.headers = {};
      }

      // Only inject auth for supabase entries
      if (name.toLowerCase().includes("supabase")) {
        if (supabasePat) {
          // Best: your Supabase PAT / access token
          serverConfig.headers.Authorization = `Bearer ${supabasePat}`;
        } else {
          // If user already put Authorization in mcp.json, normalize it
          const existing = serverConfig.headers.Authorization || "";
          if (existing && !existing.startsWith("Bearer ")) {
            serverConfig.headers.Authorization = `Bearer ${existing}`;
          } else if (!existing && supabaseAnon) {
            // Last resort—often insufficient for hosted MCP
            serverConfig.headers.Authorization = `Bearer ${supabaseAnon}`;
          }
        }
      }
    }
  }

  return servers;
}

/**
 * Initialize MCP once per process.
 * Maps from Python init_mcp function
 */
export async function initMcp(serverName: string = "supabase"): Promise<void> {
  // Simple lock mechanism (in production, use proper async lock)
  if (_initLock) {
    return;
  }
  _initLock = true;

  try {
    // Already initialized -> nothing to do
    if (_toolNode !== null) {
      return;
    }

    const mcpServers = loadMcpServers();
    
    // Create MultiServerMCPClient with the server configuration
    _client = new MultiServerMCPClient({
      mcpServers: mcpServers,
      useStandardContentBlocks: true,
    });

    // Get tools from all MCP servers
    // This creates a persistent connection
    _tools = await _client.getTools();

    // ToolNode is what LangGraph uses to execute tool calls
    // handleToolErrors=true will catch tool errors and convert them to tool messages
    _toolNode = new ToolNode(_tools, { handleToolErrors: true });

    console.log(`MCP initialized with persistent session (server=${serverName})`);
  } catch (error) {
    _initLock = false;
    throw error;
  }
}

/**
 * Close the persistent MCP session and clear caches.
 * Maps from Python shutdown_mcp function
 */
export async function shutdownMcp(): Promise<void> {
  if (_initLock) {
    try {
      // Close client if it exists
      if (_client && typeof _client.close === "function") {
        await _client.close();
      }
    } catch (error) {
      console.error("Error closing MCP client:", error);
    } finally {
      _toolNode = null;
      _tools = null;
      _client = null;
      _initLock = false;
      console.log("MCP shutdown complete");
    }
  }
}

/**
 * Get cached tools; lazily initializes MCP if needed.
 * Maps from Python get_mcp_tools function
 */
export async function getMcpTools(): Promise<StructuredToolInterface[]> {
  if (_tools === null) {
    await initMcp();
  }
  return _tools!;
}

/**
 * Get cached ToolNode; lazily initializes MCP if needed.
 * Maps from Python get_mcp_tool_node function
 */
export async function getMcpToolNode(): Promise<ToolNode> {
  if (_toolNode === null) {
    await initMcp();
  }
  return _toolNode!;
}

