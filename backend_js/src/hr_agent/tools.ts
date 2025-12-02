/**
 * LangChain tools for HR Agent
 * Maps from Python tools.py
 */

import { tool } from "@langchain/core/tools";
import { getContent, formatStructuredData } from "./utils.js";

/**
 * Get the full content of a document by its ID (UUID).
 *
 * Returns formatted text content for PDFs/text files and formatted structured data for Excel files.
 * Use this when you have a document ID and need to read its contents to answer questions about it.
 *
 * Maps from Python get_document_context tool
 */
export const getDocumentContext = tool(
  async (input: { document_id: string }): Promise<string> => {
    const { contentText, contentStructured } = await getContent(input.document_id);

    // Format for LLM
    let formattedContext = contentText || "";
    if (contentStructured) {
      const structuredText = formatStructuredData(contentStructured);
      if (structuredText) {
        formattedContext += "\n\nStructured Data:\n" + structuredText;
      }
    }

    return formattedContext || "Document not found or has no content.";
  },
  {
    name: "get_document_context",
    description:
      "Get the full content of a document by its ID (UUID). " +
      "Returns formatted text content for PDFs/text files and formatted structured data for Excel files. " +
      "Use this when you have a document ID and need to read its contents to answer questions about it.",
    schema: {
      type: "object",
      properties: {
        document_id: {
          type: "string",
          description: "The UUID of the document to retrieve content from",
        },
      },
      required: ["document_id"],
    },
  }
);

