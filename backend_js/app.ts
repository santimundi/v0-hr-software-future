/**
 * Express.js FastAPI equivalent
 * Maps from Python app.py
 */

// Set up logging FIRST, before any other imports that might use logging
import { setupLogging } from "./src/logging_config.js";
setupLogging();

import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage } from "@langchain/core/messages";
import { GraphBuilder } from "./src/hr_agent/graphbuilder.js";
import { initMcp, shutdownMcp, getMcpTools } from "./src/mcp/supabase.js";
import { DocumentService } from "./src/services/main.js";
import * as logging_utils from "./src/hr_agent/logging_utils.js";

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

// Global document service instance
let documentService: DocumentService | null = null;

/**
 * Startup: Initialize MCP and build graph
 * Equivalent to FastAPI lifespan startup
 */
async function startup() {
  console.log("Starting up the app...");
  
  // Initialize MCP and build graph
  await initMcp("supabase");
  const tools = await getMcpTools();
  graph = new GraphBuilder(llm, tools).buildGraph();
  
  // Initialize document service
  documentService = new DocumentService();
  
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
    const {
      query,
      employee_id,
      employee_name,
      job_title,
      document_name,
    } = req.body;

    // Add separator for new request
    logging_utils.logger.info("-".repeat(80));
    logging_utils.logger.info(
      `NEW REQUEST - ${new Date().toISOString().replace("T", " ").split(".")[0]}`
    );
    logging_utils.logger.info("-".repeat(80));

    // Log the received payload
    logging_utils.logger.info(
      `Received /query request - Employee ID: ${employee_id}, Employee Name: ${employee_name}, Job Title: ${job_title}, Document Name: ${document_name || ""}, Query: ${query}`
    );

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
        user_query: query,
        employee_id: employee_id,
        employee_name: employee_name || "",
        job_title: job_title || "",
        document_name: document_name || "",
      },
      config
    );

    // Log request completion
    const lastMessage = response.messages[response.messages.length - 1];
    const responseContent =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);
    logging_utils.logger.info(
      `Request completed - Response length: ${responseContent.length} characters`
    );
    logging_utils.logger.info("-".repeat(80));

    // Return final assistant message content
    return res.json({
      data: responseContent,
    });
  } catch (error: any) {
    logging_utils.logger.error("Error processing query:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

/**
 * Upload file endpoint
 * Maps from Python @app.post("/upload_file")
 */
app.post("/upload_file", async (req: Request, res: Response) => {
  try {
    // Extract JSON payload
    const {
      employee_id,
      employee_name,
      filename,
      file_bytes,
    } = req.body;

    if (!employee_id) {
      return res.status(400).json({
        response: {
          status_code: 400,
          message: "employee_id is required",
        },
      });
    }

    if (!filename) {
      return res.status(400).json({
        response: {
          status_code: 400,
          message: "filename is required",
        },
      });
    }

    if (!file_bytes || !Array.isArray(file_bytes)) {
      return res.status(400).json({
        response: {
          status_code: 400,
          message: "file_bytes is required and must be an array",
        },
      });
    }

    // Convert array of bytes (0-255) back to actual Buffer
    const fileBytes = Buffer.from(file_bytes);

    // Get document service instance
    if (!documentService) {
      return res.status(500).json({
        response: {
          status_code: 500,
          message: "Document service not initialized",
        },
      });
    }

    // Process document upload
    const result = await documentService.processDocumentUpload(
      employee_id,
      employee_name || "",
      filename,
      fileBytes
    );

    // Return response in the expected format
    return res.json({
      response: {
        status_code: result.statusCode,
        message: result.message,
      },
    });
  } catch (error: any) {
    logging_utils.logger.error("Error processing file upload:", error);
    return res.status(500).json({
      response: {
        status_code: 500,
        message: error.message || "Internal server error",
      },
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

