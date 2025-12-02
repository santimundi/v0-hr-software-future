/**
 * Utility functions for RAG operations to retrieve document content from Supabase.
 *
 * Note: These are utility functions, not LangChain tools. For actual LangChain tools,
 * see the MCP tools in src/mcp/supabase.ts and tools in src/hr_agent/tools.ts.
 */

import { getSupabaseClient } from "../services/helpers.js";
import * as logging_utils from "./logging_utils.js";

/**
 * Query the documents_1 table to get the content_text and content_structured fields for a document.
 *
 * Maps from Python get_content function
 */
export async function getContent(
  documentId: string
): Promise<{ contentText: string | null; contentStructured: any | null }> {
  try {
    const supabase = getSupabaseClient();

    logging_utils.logger.info(
      `Querying documents_1 table for document_id: ${documentId}`
    );

    // Query documents_1 table for the specific document
    const { data, error } = await supabase
      .from("documents_1")
      .select("content, content_structured")
      .eq("id", documentId)
      .single();

    // Check for errors
    if (error) {
      const errorMsg = `Database query error: ${error.message}`;
      logging_utils.logger.error(errorMsg);
      return { contentText: null, contentStructured: null };
    }

    // Extract content from response
    if (data) {
      const contentText = data.content || null;
      const contentStructured = data.content_structured || null;

      logging_utils.logger.info(
        `Successfully retrieved content for document_id: ${documentId}`
      );
      return { contentText, contentStructured };
    }

    // Document not found
    logging_utils.logger.warning(
      `Document with id '${documentId}' not found in database`
    );
    return { contentText: null, contentStructured: null };
  } catch (error: any) {
    const errorMsg = `Failed to query document content: ${error.message}`;
    logging_utils.logger.error(errorMsg);
    return { contentText: null, contentStructured: null };
  }
}

/**
 * Convert structured content (from Excel files) into a readable string format.
 *
 * Takes the preview_rows from content_structured and converts each row to a text format.
 * Returns a single string with all rows formatted.
 *
 * Maps from Python format_structured_data function
 */
export function formatStructuredData(structured: any): string {
  if (!structured || typeof structured !== "object") {
    return "";
  }

  const previewRows = structured.preview_rows || [];
  if (!Array.isArray(previewRows)) {
    return "";
  }

  const columns = structured.columns || [];

  // Convert all rows to text format
  const rowTexts: string[] = [];
  for (let rowIdx = 0; rowIdx < previewRows.length; rowIdx++) {
    const row = previewRows[rowIdx];
    if (typeof row !== "object" || row === null) {
      continue;
    }

    // Convert row dict to text format: "column1=value1 | column2=value2 | ..."
    const rowParts: string[] = [];
    for (const col of columns) {
      const value = row[col];
      // Format value: handle null/undefined, convert to string
      const valueStr = value == null ? "N/A" : String(value);
      rowParts.push(`${col}=${valueStr}`);
    }

    // If no columns metadata, use all keys from the row
    if (rowParts.length === 0) {
      for (const [k, v] of Object.entries(row)) {
        if (v != null) {
          rowParts.push(`${k}=${v}`);
        }
      }
    }

    const rowText = `Row ${rowIdx + 1}: ${rowParts.join(" | ")}`;
    rowTexts.push(rowText);
  }

  // Join all rows with newline separator (no chunking needed for direct injection)
  return rowTexts.join("\n");
}

