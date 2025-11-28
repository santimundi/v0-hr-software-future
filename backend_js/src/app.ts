/**
 * Express.js FastAPI equivalent
 * Maps from Python app.py
 */

import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage } from "@langchain/core/messages";
import { GraphBuilder } from "./graphbuilder.js";
import { initMcp, shutdownMcp, getMcpToolNode } from "./tools.js";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Create Express app
const app = express();

// CORS middleware (equivalent to FastAPI CORSMiddleware)
app.use(
  cors({
    origin: "http://localhost:3000", // Allow your Next.js frontend
    credentials: true,
    methods: ["*"],
    allowedHeaders: ["*"],
  })
);

// JSON body parser
app.use(express.json());

// We create the LLM once per process; no need to recreate it per request
const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY,
});

// Global graph instance (cached, built at startup)
let graph: ReturnType<GraphBuilder["buildGraph"]> | null = null;

/**
 * Startup: Initialize MCP and build graph
 * Equivalent to FastAPI lifespan startup
 */
async function startup() {
  console.log("Starting up the app...");
  
  // Initialize MCP and build graph
  await initMcp("supabase");
  const toolNode = await getMcpToolNode();
  graph = new GraphBuilder(llm, toolNode).buildGraph();
  
  console.log("Graph built and ready");
}

/**
 * Shutdown: Cleanup MCP session
 * Equivalent to FastAPI lifespan shutdown
 */
async function shutdown() {
  console.log("Shutting down the app...");
  await shutdownMcp();
}

// -----------------------------
// API endpoint
// -----------------------------
/**
 * Main endpoint called by the frontend
 * Maps from Python @app.post("/query")
 */
app.post("/query", async (req: Request, res: Response) => {
  try {
    // Extract JSON payload
    const { query, employee_id, employee_name, job_title } = req.body;

    if (!query) {
      return res.status(400).json({ error: "query is required" });
    }

    if (!employee_id) {
      return res.status(400).json({ error: "employee_id is required" });
    }

    // Reuse the cached graph (DO NOT rebuild per request)
    if (!graph) {
      return res.status(500).json({ error: "Graph not initialized" });
    }

    // LangGraph config (thread_id uses employee_id for per-employee conversation memory)
    const config = {
      configurable: {
        thread_id: employee_id,
      },
    };

    // Run the graph asynchronously
    const response = await graph.invoke(
      {
        messages: [new HumanMessage({ content: query })],
        employee_id: employee_id,
        employee_name: employee_name || "",
        job_title: job_title || "",
      },
      config
    );

    // Return final assistant message content
    const lastMessage = response.messages[response.messages.length - 1];
    return res.json({
      data: typeof lastMessage.content === "string" 
        ? lastMessage.content 
        : JSON.stringify(lastMessage.content),
    });
  } catch (error: any) {
    console.error("Error processing query:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", graph_initialized: graph !== null });
});

// -----------------------------
// Server startup
// -----------------------------
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || "0.0.0.0";

// Start server with lifecycle management
async function main() {
  try {
    // Startup
    await startup();

    // Start Express server
    app.listen(Number(PORT), HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log("SIGTERM received, shutting down gracefully...");
      await shutdown();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      console.log("SIGINT received, shutting down gracefully...");
      await shutdown();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Run the server
main();

export default app;

