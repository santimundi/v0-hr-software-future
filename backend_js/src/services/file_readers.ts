/**
 * File readers for extracting document content for ingestion.
 *
 * Maps from Python file_readers.py
 */

import winston from "winston";
// @ts-ignore - pdf-parse is a CommonJS module
import pdfParse from "pdf-parse";
import * as XLSX from "xlsx";

// Use Winston's default logger (configured in logging_config.ts)
const logger = winston;

const EXCEL_PREVIEW_ROWS = 1000;

/**
 * Normalize values so they can be stored in JSON/JSONB.
 *
 * Maps from Python _json_safe function
 */
function jsonSafe(value: any): any {
  if (value === null || value === undefined) {
    return null;
  }

  // NaN/Infinity
  if (typeof value === "number" && !isFinite(value)) {
    return null;
  }

  // Date -> ISO string
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Recursively process objects and arrays
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return value.map(jsonSafe);
    }
    const result: any = {};
    for (const [k, v] of Object.entries(value)) {
      result[String(k)] = jsonSafe(v);
    }
    return result;
  }

  return value;
}

/**
 * Extract text from a PDF (text-based PDFs only).
 *
 * Maps from Python read_pdf function
 */
export async function readPdf(
  fileBytes: Buffer
): Promise<{
  kind: string;
  contentText: string;
  contentStructured: null;
  warnings: string[];
}> {
  const warnings: string[] = [];
  try {
    const data = await pdfParse(fileBytes);
    const contentText = data.text || "";

    if (!contentText.trim()) {
      warnings.push(
        "No extractable text found (likely scanned/image-based PDF)."
      );
    }

    return {
      kind: "pdf",
      contentText: contentText.trim(),
      contentStructured: null,
      warnings,
    };
  } catch (error: any) {
    logger.error("read_pdf failed", error);
    return {
      kind: "pdf",
      contentText: "",
      contentStructured: null,
      warnings: [`PDF extraction failed: ${error.message}`],
    };
  }
}

/**
 * Decode a text file into a string.
 *
 * Maps from Python read_text_file function
 */
export function readTextFile(
  fileBytes: Buffer,
  encoding: BufferEncoding = "utf-8"
): {
  kind: string;
  contentText: string;
  contentStructured: null;
  warnings: string[];
} {
  const warnings: string[] = [];
  try {
    let text: string;
    try {
      text = fileBytes.toString(encoding);
    } catch (error: any) {
      warnings.push(
        `Decode with ${encoding} failed; used utf-8 replace. (${error.message})`
      );
      text = fileBytes.toString("utf8");
    }

    return {
      kind: "text",
      contentText: text,
      contentStructured: null,
      warnings,
    };
  } catch (error: any) {
    logger.error("read_text_file failed", error);
    return {
      kind: "text",
      contentText: "",
      contentStructured: null,
      warnings: [`Text decode failed: ${error.message}`],
    };
  }
}

/**
 * Read an Excel file (assumes ONE sheet) and return:
 * - content_text: markdown preview (headers + first max_rows)
 * - content_structured: json-safe index (for jsonb storage)
 *
 * Maps from Python read_excel function
 */
export function readExcel(
  fileBytes: Buffer,
  maxRows: number = EXCEL_PREVIEW_ROWS
): {
  kind: string;
  contentText: string;
  contentStructured: any;
  warnings: string[];
} {
  const warnings: string[] = [];
  try {
    const workbook = XLSX.read(fileBytes, { type: "buffer" });
    const sheetNames = workbook.SheetNames;

    if (!sheetNames || sheetNames.length === 0) {
      return {
        kind: "excel",
        contentText: "",
        contentStructured: {
          sheet_name: null,
          row_count: 0,
          columns: [],
          preview_rows: [],
        },
        warnings: ["Excel contained no sheets."],
      };
    }

    const sheetName = sheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    // Drop fully empty rows (data is already an array of objects)
    const filteredData = data.filter((row: any) => {
      return Object.values(row).some((val) => val != null && val !== "");
    });

    const totalRows = filteredData.length;
    const truncated = totalRows > maxRows;
    if (truncated) {
      warnings.push(
        `Sheet '${sheetName}' truncated to first ${maxRows} rows.`
      );
    }

    const previewData = filteredData.slice(0, maxRows);

    // Get columns from first row
    const columns =
      previewData.length > 0
        ? Object.keys(previewData[0] as any)
        : [];

    // Markdown preview for the LLM
    let contentText = `## Sheet: ${sheetName}\n`;
    if (previewData.length === 0) {
      contentText += "(empty)\n";
    } else {
      // Convert to markdown table
      contentText += "| " + columns.join(" | ") + " |\n";
      contentText += "| " + columns.map(() => "---").join(" | ") + " |\n";
      for (const row of previewData) {
        const values = columns.map(
          (col) => String((row as any)[col] || "")
        );
        contentText += "| " + values.join(" | ") + " |\n";
      }
      if (truncated) {
        contentText += `\n*Note: Showing ${maxRows} of ${totalRows} total rows*`;
      }
    }

    const previewRows = jsonSafe(previewData);

    const contentStructured = {
      sheet_name: sheetName,
      columns: columns,
      row_count: totalRows,
      preview_row_count: previewData.length,
      preview_rows: previewRows,
      truncated: truncated,
      max_rows: maxRows,
    };

    return {
      kind: "excel",
      contentText: contentText.trim(),
      contentStructured: contentStructured,
      warnings,
    };
  } catch (error: any) {
    logger.error("read_excel failed", error);
    return {
      kind: "excel",
      contentText: "",
      contentStructured: { error: String(error) },
      warnings: [`Excel read failed: ${error.message}`],
    };
  }
}

