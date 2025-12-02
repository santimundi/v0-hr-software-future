/**
 * Database and file processing operations.
 *
 * This module contains operations for:
 * - File content extraction (PDF, text, Excel)
 * - Employee UUID lookup from database
 * - File storage uploads
 * - Document insertion into database
 *
 * Maps from Python database_operations.py
 */

import winston from "winston";
import {
  getSupabaseClient,
  guessContentType,
  makeStoragePath,
  BUCKET,
} from "./helpers.js";
import { readPdf, readTextFile, readExcel } from "./file_readers.js";

// Use Winston's default logger (configured in logging_config.ts)
const logger = winston;

/**
 * Read and extract content from a file based on its extension.
 *
 * Maps from Python read_file function
 */
export async function readFile(
  filename: string,
  fileBytes: Buffer
): Promise<{
  contentText: string;
  contentStructured: any | null;
  warnings: string[];
}> {
  const lower = filename.toLowerCase();

  let response: {
    kind: string;
    contentText: string;
    contentStructured: any | null;
    warnings: string[];
  };

  if (lower.endsWith(".pdf")) {
    response = await readPdf(fileBytes);
  } else if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    response = readTextFile(fileBytes);
  } else if (
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xlsm") ||
    lower.endsWith(".xls")
  ) {
    response = readExcel(fileBytes);
  } else {
    response = {
      kind: "unknown",
      contentText: "",
      contentStructured: null,
      warnings: ["File extension not recognized"],
    };
  }

  return {
    contentText: response.contentText || "",
    contentStructured: response.contentStructured || null,
    warnings: response.warnings || [],
  };
}

/**
 * Query the employees table to get the UUID of an employee by their employee_id.
 *
 * Maps from Python get_employee_uuid function
 */
export async function getEmployeeUuid(
  employeeId: string
): Promise<{ uuid: string | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();

    // Normalize employee_id by removing dashes (backend stores as 'EMP001', frontend may send 'EMP-001')
    const normalizedEmployeeId = employeeId.replace(/-/g, "");

    logger.info(
      `Querying employees table for employee_id: ${employeeId} (normalized: ${normalizedEmployeeId})`
    );

    // Query employees table where employee_id matches
    const { data, error } = await supabase
      .from("employees")
      .select("id")
      .eq("employee_id", normalizedEmployeeId)
      .single();

    // Check for errors
    if (error) {
      const errorMsg = `Database query error: ${error.message}`;
      logger.error(errorMsg);
      return { uuid: null, error: errorMsg };
    }

    // Extract UUID from response
    if (data && data.id) {
      const employeeUuid = data.id;
      logger.info(
        `Found employee UUID: ${employeeUuid} for employee_id: ${employeeId}`
      );
      return { uuid: String(employeeUuid), error: null };
    }

    // Employee not found
    const errorMsg = `Employee with employee_id '${employeeId}' not found`;
    logger.warn(errorMsg);
    return { uuid: null, error: errorMsg };
  } catch (error: any) {
    const errorMsg = `Failed to query employee UUID: ${error.message}`;
    logger.error(errorMsg);
    return { uuid: null, error: errorMsg };
  }
}

/**
 * Upload a file to a PRIVATE Supabase Storage bucket.
 *
 * Maps from Python upload_to_storage function
 */
export async function uploadToStorage(
  employeeId: string,
  filename: string,
  fileBytes: Buffer
): Promise<{ filePath: string | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();

    // Generate storage path (normalizes employee_id internally)
    const path = makeStoragePath(employeeId, filename);

    // Guess content type from filename
    const contentType = guessContentType(filename);

    logger.info(
      `Uploading file to storage: bucket=${BUCKET}, path=${path}, content_type=${contentType}`
    );

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, fileBytes, {
        contentType: contentType,
        upsert: true,
      });

    // Check for errors
    if (error) {
      const errorMsg = `Storage upload error: ${error.message}`;
      logger.error(errorMsg);
      return { filePath: null, error: errorMsg };
    }

    logger.info(`Successfully uploaded file to storage: ${path}`);
    return { filePath: path, error: null };
  } catch (error: any) {
    const errorMsg = `Failed to upload file to storage: ${error.message}`;
    logger.error(errorMsg);
    return { filePath: null, error: errorMsg };
  }
}

/**
 * Insert a row into the specified table.
 *
 * Maps from Python insert_into_table function
 */
export async function insertIntoTable(
  tableName: string,
  documentData: Record<string, any>
): Promise<{
  success: boolean;
  documentId: string | null;
  error: string | null;
  insertedData: any | null;
}> {
  try {
    const supabase = getSupabaseClient();

    // Add created_at if not provided
    if (!documentData.created_at) {
      documentData.created_at = new Date().toISOString();
    }

    logger.info(
      `Inserting document into '${tableName}' table with fields: ${Object.keys(documentData).join(", ")}`
    );

    // Insert the row
    const { data, error } = await supabase
      .from(tableName)
      .insert(documentData)
      .select()
      .single();

    // Check for errors
    if (error) {
      const errorMsg = `Database insert error: ${error.message}`;
      logger.error(errorMsg);
      return { success: false, documentId: null, error: errorMsg, insertedData: null };
    }

    // Extract inserted data
    if (data) {
      const insertedId = data.id || null;

      logger.info(
        `Successfully inserted document with id: ${insertedId}`
      );
      return {
        success: true,
        documentId: insertedId ? String(insertedId) : null,
        error: null,
        insertedData: data,
      };
    } else {
      // No data returned but no error - might be successful but empty response
      logger.warn(
        `Insert into '${tableName}' completed but no data returned`
      );
      return { success: true, documentId: null, error: null, insertedData: null };
    }
  } catch (error: any) {
    const errorMsg = `Failed to insert document: ${error.message}`;
    logger.error(errorMsg);
    return { success: false, documentId: null, error: errorMsg, insertedData: null };
  }
}

