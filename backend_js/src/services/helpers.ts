/**
 * Helper functions for Supabase client, storage operations, and LLM summarization.
 *
 * This module provides:
 * - Supabase client initialization
 * - Storage path and content type utilities
 * - Document summarization using LLM
 *
 * Maps from Python helpers.py
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ChatGroq } from "@langchain/groq";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import winston from "winston";

// Use Winston's default logger (configured in logging_config.ts)
const logger = winston;

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const BUCKET = process.env.SUPABASE_DOCS_BUCKET || "hr-documents";

// Initialize Supabase client (using service role key for admin operations)
let _supabaseAdmin: SupabaseClient | null = null;

// Document summarization prompt
const SUMMARY_PROMPT = `Generate a title and summary for the document.

**Title**: Create a clean title from the filename by removing extensions, replacing underscores/hyphens with spaces, and capitalizing properly.

**Summary**: Generate a one-line summary (max 200 characters) describing what the document is about, based on the file content and filename.

Return structured output with \`title\` and \`ai_summary\` fields.`.trim();

const SummaryOutputSchema = z.object({
  ai_summary: z.string().describe("One-line AI-generated summary of the document"),
  title: z.string().describe("A simple one line ai generated title of the document"),
});

/**
 * Get or create Supabase admin client instance (singleton pattern).
 *
 * Maps from Python get_supabase_client function
 */
export function getSupabaseClient(): SupabaseClient {
  if (_supabaseAdmin === null) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "Supabase credentials not found. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
      );
    }
    _supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

/**
 * Guess the MIME content type from filename.
 *
 * Maps from Python guess_content_type function
 */
export function guessContentType(filename: string): string {
  // Simple MIME type guessing (Node.js doesn't have built-in mimetypes like Python)
  const ext = filename.toLowerCase().split(".").pop() || "";
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    xlsm: "application/vnd.ms-excel.sheet.macroEnabled.12",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Generate a storage path for the file.
 *
 * Format: employees/{employee_id}/{timestamp}_{safe_filename}
 *
 * Maps from Python make_storage_path function
 */
export function makeStoragePath(employeeId: string, filename: string): string {
  // Generate UTC timestamp in ISO format (YYYYMMDDTHHMMSSZ)
  const now = new Date();
  const ts = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  // Sanitize filename: strip whitespace and replace spaces with underscores
  const safe = filename.trim().replace(/\s+/g, "_");

  // Normalize employee_id by removing dashes (ensure format like "EMP005")
  const normalizedEmployeeId = employeeId.replace(/-/g, "");

  return `employees/${normalizedEmployeeId}/${ts}_${safe}`;
}

/**
 * Generate a title and summary for a document using an LLM.
 *
 * Maps from Python generate_summary function
 */
export async function generateSummary(
  fileContent: string,
  filename: string
): Promise<{ title: string; summary: string }> {
  const llm = new ChatGroq({
    model: "openai/gpt-oss-120b",
    apiKey: process.env.GROQ_API_KEY,
  });
  const llmWithStructuredOutput = llm.withStructuredOutput(SummaryOutputSchema);

  const messages = [
    new SystemMessage({ content: SUMMARY_PROMPT }),
    new HumanMessage({
      content: `File Content: ${fileContent}, Filename: ${filename}`,
    }),
  ];

  const response = await llmWithStructuredOutput.invoke(messages);

  return { title: response.title, summary: response.ai_summary };
}

