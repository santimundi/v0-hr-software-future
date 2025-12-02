/**
 * Document service for orchestrating document upload workflows.
 *
 * This module provides the main DocumentService class that orchestrates
 * all document processing operations in a single workflow.
 *
 * Maps from Python main.py
 */

import winston from "winston";
import {
  readFile,
  getEmployeeUuid,
  uploadToStorage,
  insertIntoTable,
} from "./database_operations.js";
import { generateSummary } from "./helpers.js";

// Use Winston's default logger (configured in logging_config.ts)
const logger = winston;

/**
 * Service class for document processing operations.
 *
 * Handles orchestration of all document upload workflows:
 * - File content extraction (PDF, text, Excel)
 * - Employee UUID lookup
 * - File storage uploads
 * - Database document insertion
 * - Document summarization (LLM-based)
 *
 * Maps from Python DocumentService class
 */
export class DocumentService {
  /**
   * Initialize the document service.
   */
  constructor() {
    // No initialization needed
  }

  /**
   * Process a complete document upload workflow.
   *
   * This method orchestrates all the steps:
   * 1. Reads the file's content
   * 2. Gets the employee UUID
   * 3. Uploads the file to storage
   * 4. Generates a summary
   * 5. Inserts the document into the database
   *
   * Maps from Python process_document_upload method
   */
  async processDocumentUpload(
    employeeId: string,
    employeeName: string,
    filename: string,
    fileBytes: Buffer
  ): Promise<{
    success: boolean;
    statusCode: number;
    message: string;
    documentId?: string | null;
  }> {
    try {
      // Step 1: Read file content
      const fileData = await readFile(filename, fileBytes);
      const contentText = fileData.contentText;
      const contentStructured = fileData.contentStructured;

      // Step 2: Get employee UUID
      const { uuid: employeeUuid, error: uuidError } = await getEmployeeUuid(
        employeeId
      );
      if (uuidError || !employeeUuid) {
        return {
          success: false,
          statusCode: 404,
          message: `Employee not found: ${uuidError || "Unknown error"}`,
          documentId: null,
        };
      }

      // Step 3: Upload to storage (use employee_id, not UUID, for storage path)
      const { filePath, error: storageError } = await uploadToStorage(
        employeeId,
        filename,
        fileBytes
      );
      if (storageError || !filePath) {
        return {
          success: false,
          statusCode: 500,
          message: `Storage upload failed: ${storageError || "Unknown error"}`,
          documentId: null,
        };
      }

      // Step 4: Generate summary
      const { title, summary: aiSummary } = await generateSummary(
        contentText,
        filename
      );

      // Step 5: Insert document into database
      const documentData = {
        owner_employee_id: employeeUuid,
        content: contentText,
        content_structured: contentStructured,
        uploaded_by: employeeName,
        title: title,
        ai_summary: aiSummary,
        file_url: filePath,
      };

      const {
        success,
        documentId,
        error: insertError,
      } = await insertIntoTable("documents_1", documentData);

      if (success) {
        return {
          success: true,
          statusCode: 200,
          message: "Document successfully uploaded and inserted",
          documentId: documentId,
        };
      } else {
        // Determine appropriate error code based on error type
        let statusCode = 500;
        const errorLower = (insertError || "").toLowerCase();
        if (
          errorLower.includes("not found") ||
          errorLower.includes("does not exist")
        ) {
          statusCode = 404;
        } else if (
          errorLower.includes("validation") ||
          errorLower.includes("invalid") ||
          errorLower.includes("constraint")
        ) {
          statusCode = 400;
        }

        return {
          success: false,
          statusCode: statusCode,
          message: `Failed to insert document: ${insertError || "Unknown error"}`,
          documentId: null,
        };
      }
    } catch (error: any) {
      const errorMsg = `Document upload processing failed: ${error.message}`;
      logger.error(errorMsg);
      return {
        success: false,
        statusCode: 500,
        message: errorMsg,
        documentId: null,
      };
    }
  }
}

