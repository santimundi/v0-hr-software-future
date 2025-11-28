"""
File readers for extracting document content for ingestion.
"""

import logging
from io import BytesIO
from typing import Any, Dict, List
from datetime import datetime, date
from decimal import Decimal

import pandas as pd
from pypdf import PdfReader

logger = logging.getLogger(__name__)

EXCEL_PREVIEW_ROWS = 200


def _json_safe(value: Any) -> Any:
    """
    Normalize values so they can be stored in JSON/JSONB.

    Converts:
    - NaN/NaT -> None
    - datetime/date/Timestamp -> ISO string
    - numpy scalars -> python scalars
    - Decimal -> float
    Recurses into lists/dicts.
    """
    if value is None:
        return None

    # pandas NaN/NaT
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    # datetime/date
    if isinstance(value, (datetime, date)):
        return value.isoformat()

    # pandas Timestamp
    if isinstance(value, pd.Timestamp):
        return value.to_pydatetime().isoformat()

    # numpy scalars -> python scalars
    if hasattr(value, "item") and callable(value.item):
        try:
            return value.item()
        except Exception:
            pass

    # Decimal -> float
    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]

    return value


def read_pdf(file_bytes: bytes) -> Dict[str, Any]:
    """
    Extract text from a PDF (text-based PDFs only).

    Args:
        file_bytes: PDF content as bytes.

    Returns:
        Dict with: kind, content_text, content_structured(None), warnings.
    """
    warnings: List[str] = []
    try:
        reader = PdfReader(BytesIO(file_bytes))
        parts: List[str] = []

        for page_num, page in enumerate(reader.pages, start=1):
            try:
                txt = page.extract_text() or ""
                if txt.strip():
                    parts.append(txt)
                else:
                    warnings.append(f"Page {page_num}: no extractable text (may be scanned).")
            except Exception as e:
                warnings.append(f"Page {page_num}: extraction error: {e}")

        content_text = "\n\n".join(parts).strip()
        if not content_text:
            warnings.append("No extractable text found (likely scanned/image-based PDF).")

        return {
            "kind": "pdf",
            "content_text": content_text,
            "content_structured": None,
            "warnings": warnings,
        }

    except Exception as e:
        logger.exception("read_pdf failed")
        return {
            "kind": "pdf",
            "content_text": "",
            "content_structured": None,
            "warnings": [f"PDF extraction failed: {e}"],
        }


def read_text_file(file_bytes: bytes, encoding: str = "utf-8") -> Dict[str, Any]:
    """
    Decode a text file into a string.

    Args:
        file_bytes: Text file bytes.
        encoding: Preferred encoding (default utf-8). Falls back to utf-8 replace.

    Returns:
        Dict with: kind, content_text, content_structured(None), warnings.
    """
    warnings: List[str] = []
    try:
        try:
            text = file_bytes.decode(encoding)
        except Exception as e:
            warnings.append(f"Decode with {encoding} failed; used utf-8 replace. ({e})")
            text = file_bytes.decode("utf-8", errors="replace")

        return {
            "kind": "text",
            "content_text": text,
            "content_structured": None,
            "warnings": warnings,
        }

    except Exception as e:
        logger.exception("read_text_file failed")
        return {
            "kind": "text",
            "content_text": "",
            "content_structured": None,
            "warnings": [f"Text decode failed: {e}"],
        }



def read_excel(file_bytes: bytes, max_rows: int = EXCEL_PREVIEW_ROWS) -> Dict[str, Any]:
    """
    Read an Excel file (assumes ONE sheet) and return:
    - content_text: markdown preview (headers + first max_rows)
    - content_structured: json-safe index (for jsonb storage)

    Args:
        file_bytes: Excel bytes (.xlsx).
        max_rows: Preview size (default 200).

    Returns:
        Dict with: kind, content_text, content_structured(dict), warnings.

    """
    warnings: List[str] = []
    try:
        xls = pd.ExcelFile(BytesIO(file_bytes), engine="openpyxl")
        if not xls.sheet_names:
            return {
                "kind": "excel",
                "content_text": "",
                "content_structured": {"sheet_name": None, "row_count": 0, "columns": [], "preview_rows": []},
                "warnings": ["Excel contained no sheets."],
            }

        sheet_name = xls.sheet_names[0]
        df = xls.parse(sheet_name=sheet_name)

        # Drop fully empty rows/cols
        df = df.dropna(axis=0, how="all").dropna(axis=1, how="all")

        total_rows = int(df.shape[0])
        truncated = total_rows > max_rows
        if truncated:
            warnings.append(f"Sheet '{sheet_name}' truncated to first {max_rows} rows.")

        preview_df = df.head(max_rows).copy()
        preview_df = preview_df.astype("object").where(pd.notnull(preview_df), None)

        # Markdown preview for the LLM (tabulate installed)
        content_text = f"## Sheet: {sheet_name}\n"
        if preview_df.empty:
            content_text += "(empty)\n"
        else:
            content_text += preview_df.to_markdown(index=False, tablefmt="github")
            if truncated:
                content_text += f"\n\n*Note: Showing {max_rows} of {total_rows} total rows*"

        columns = [str(c) for c in df.columns]
        preview_rows = _json_safe(preview_df.to_dict(orient="records"))

        content_structured = {
            "sheet_name": sheet_name,
            "columns": columns,
            "row_count": total_rows,
            "preview_row_count": int(len(preview_df)),
            "preview_rows": preview_rows,
            "truncated": truncated,
            "max_rows": int(max_rows),
        }

        return {
            "kind": "excel",
            "content_text": content_text.strip(),
            "content_structured": content_structured,
            "warnings": warnings,
        }

    except Exception as e:
        logger.exception("read_excel failed")
        return {
            "kind": "excel",
            "content_text": "",
            "content_structured": {"error": str(e)},
            "warnings": [f"Excel read failed: {e}"],
        }

