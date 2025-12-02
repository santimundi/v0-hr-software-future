/**
 * Logging utility functions for HR agent nodes.
 *
 * This module provides helper functions for consistent logging across all nodes,
 * including node entry/exit logging, tool call logging, and debug information.
 *
 * Maps from Python logging_utils.py
 */

import { createLogger, format, transports } from "winston";
import type { AIMessage, ToolMessage } from "@langchain/core/messages";

// Create logger instance
export const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : "";
      return `${timestamp} - ${level.toUpperCase()} - ${message} ${metaStr}`;
    })
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});

/**
 * Log entry into a graph node with a clear visual separator.
 *
 * Maps from Python log_node_entry function
 */
export function logNodeEntry(nodeName: string): void {
  logger.info("=".repeat(80));
  logger.info(`>>> NODE: ${nodeName}`);
  logger.info("=".repeat(80));
}

/**
 * Log tool calls from an LLM response.
 *
 * Maps from Python log_tool_calls function
 */
export function logToolCalls(
  response: AIMessage,
  context: string = ""
): void {
  const toolCalls = (response as any).tool_calls || [];
  if (toolCalls && toolCalls.length > 0) {
    const contextStr = context ? ` (${context})` : "";
    logger.info(
      `LLM made ${toolCalls.length} tool call(s)${contextStr}:`
    );
    for (let i = 0; i < toolCalls.length; i++) {
      const toolCall = toolCalls[i];
      const toolName = toolCall.name || "unknown";
      const toolArgs = toolCall.args || {};
      logger.info(`  Tool call ${i + 1}: ${toolName}`);
      logger.info(`    Arguments: ${JSON.stringify(toolArgs)}`);
    }
  }
}

/**
 * Log tool messages from a list of messages.
 *
 * Maps from Python log_tool_messages function
 */
export function logToolMessages(messages: any[], context: string = ""): void {
  const toolMessages = messages.filter(
    (msg) => msg._getType && msg._getType() === "tool"
  );
  if (toolMessages.length > 0) {
    const contextStr = context ? ` (${context})` : "";
    logger.info(`Found ${toolMessages.length} tool message(s)${contextStr}:`);
    for (let i = 0; i < toolMessages.length; i++) {
      const toolMsg = toolMessages[i];
      const toolName = (toolMsg as any).name || "unknown";
      const toolContent = toolMsg.content || "";
      // Log first 500 chars of tool response to see query results
      const contentPreview =
        typeof toolContent === "string"
          ? toolContent.substring(0, 500)
          : JSON.stringify(toolContent).substring(0, 500);
      logger.info(`  Tool message ${i + 1}: ${toolName}`);
      logger.info(`    Response preview: ${contentPreview}`);
    }
  }
}

/**
 * Log debug information about RAG context results and row chunks.
 *
 * Maps from Python log_rag_context_debug function
 */
export function logRagContextDebug(
  results: any[],
  rowsChunks: string[]
): void {
  logger.debug(
    `Results type: ${typeof results}, Results length: ${
      Array.isArray(results) ? results.length : "N/A"
    }`
  );
  if (Array.isArray(results) && results.length > 0) {
    logger.debug(`First result type: ${typeof results[0]}`);
    if (
      Array.isArray(results[0]) &&
      results[0].length >= 2
    ) {
      logger.debug(
        `First result content (first 200 chars): ${String(results[0][0]).substring(0, 200)}`
      );
      logger.debug(`First result score: ${results[0][1]}`);
    }
  }

  logger.debug(
    `Rows chunks type: ${typeof rowsChunks}, Rows chunks length: ${
      Array.isArray(rowsChunks) ? rowsChunks.length : "N/A"
    }`
  );
  if (Array.isArray(rowsChunks) && rowsChunks.length > 0) {
    const firstChunkPreview =
      typeof rowsChunks[0] === "string"
        ? rowsChunks[0].substring(0, 200)
        : String(rowsChunks[0]).substring(0, 200);
    logger.debug(`First row chunk (first 200 chars): ${firstChunkPreview}`);
  }
}

/**
 * Log the routing decision made by the route_query node.
 *
 * Maps from Python log_routing_decision function
 */
export function logRoutingDecision(
  rag: boolean,
  documentName: string | null,
  ragQuery: string | null,
  agentQuery: string | null
): void {
  logger.info(
    `Route query - RAG needed: ${rag}, Document name: ${documentName || "None"}`
  );
  logger.info(`RAG query: ${ragQuery || "None"}`);
  logger.info(`Agent query: ${agentQuery || "None"}`);
}

/**
 * Log all tool calls from the get_context node's LLM response.
 *
 * Maps from Python log_get_context_tool_calls function
 */
export function logGetContextToolCalls(response: AIMessage): void {
  const toolCalls = (response as any).tool_calls || [];
  if (toolCalls && toolCalls.length > 0) {
    logger.info(`get_context - Tool calls made: ${toolCalls.length}`);
    for (let i = 0; i < toolCalls.length; i++) {
      const toolCall = toolCalls[i];
      const toolName = toolCall.name || "unknown";
      const toolArgs = toolCall.args || {};
      const toolId = toolCall.id || "unknown";
      logger.info(`get_context - Tool Call ${i + 1}:`);
      logger.info(`  Tool Name: ${toolName}`);
      logger.info(`  Tool ID: ${toolId}`);
      logger.info(`  Arguments: ${JSON.stringify(toolArgs)}`);
    }
  } else {
    logger.info(`get_context - No tool calls in response`);
  }
}

/**
 * Log all tool results (tool messages) found in the state for get_context.
 *
 * Maps from Python log_get_context_tool_results function
 */
export function logGetContextToolResults(toolMessages: ToolMessage[]): void {
  if (toolMessages && toolMessages.length > 0) {
    logger.info(`get_context - Tool results found: ${toolMessages.length}`);
    for (let i = 0; i < toolMessages.length; i++) {
      const toolMsg = toolMessages[i];
      const toolName = (toolMsg as any).name || "unknown";
      const toolId = (toolMsg as any).tool_call_id || "unknown";
      const contentStr = String(toolMsg.content);
      const contentPreview =
        contentStr.length > 500 ? contentStr.substring(0, 500) : contentStr;
      logger.info(`get_context - Tool Result ${i + 1}:`);
      logger.info(`  Tool Name: ${toolName}`);
      logger.info(`  Tool Call ID: ${toolId}`);
      logger.info(`  Content (first 500 chars): ${contentPreview}`);
      if (contentStr.length > 500) {
        logger.info(`  Content length: ${contentStr.length} characters (truncated)`);
      }
    }
  } else {
    logger.info(`get_context - No tool results found in state`);
  }
}

/**
 * Log the last tool call result containing document information for ID extraction.
 *
 * Maps from Python log_last_tool_result_for_extraction function
 */
export function logLastToolResultForExtraction(
  toolMessages: ToolMessage[]
): void {
  if (toolMessages && toolMessages.length > 0) {
    const lastToolMessage = toolMessages[toolMessages.length - 1];
    logger.info(
      `get_context - Last tool call result (for document ID extraction):`
    );
    logger.info(`  Tool: ${(lastToolMessage as any).name || "unknown"}`);
    logger.info(`  Full Content: ${lastToolMessage.content}`);
  }
}

/**
 * Log the LLM response from the execute node.
 *
 * Maps from Python log_execute_response function
 */
export function logExecuteResponse(response: AIMessage): void {
  const responseContent =
    typeof response.content === "string"
      ? response.content
      : String(response.content);
  logger.info(
    `HR Agent execute response (first 500 chars): ${responseContent.substring(0, 500)}`
  );
}

