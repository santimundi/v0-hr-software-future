"""
Utility functions for the HR Agent
"""

import logging
import os
import re
from io import BytesIO
from typing import Tuple, Optional, Dict, Any, List

from dotenv import load_dotenv
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from langchain_core.messages import AIMessage
from src.services.helpers import get_supabase_client

load_dotenv(".env.local")

logger = logging.getLogger(__name__)


WRITE_PREFIXES = (
    "insert", "update", "delete", "upsert", "merge",
    "alter", "drop", "create", "truncate", "grant", "revoke"
)


def get_employee_document_content(document_id: str) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    """
    Query the employee_documents table to get the content_text and content_structured fields for a document.
    
    Args:
        document_id: The UUID of the employee document to retrieve
    
    Returns:
        Tuple of (content_text, content_structured):
        - content_text (str, optional): The extracted text content of the document
        - content_structured (dict, optional): The structured content (for Excel files) or None
    """
    try:
        supabase = get_supabase_client()
        
        logger.info(f"Querying employee_documents table for document_id: {document_id}")
        
        # Query employee_documents table for the specific document
        response = supabase.table("employee_documents").select("content, content_structured").eq("id", document_id).execute()
        
        # Check for errors
        if hasattr(response, 'error') and response.error:
            error_msg = f"Database query error: {response.error}"
            logger.error(error_msg)
            return None, None
        
        # Extract content from response
        if hasattr(response, 'data') and response.data and len(response.data) > 0:
            document = response.data[0]
            content_text = document.get("content")
            content_structured = document.get("content_structured")
            
            logger.info(f"Successfully retrieved content for document_id: {document_id}")
            return content_text, content_structured
        
        # Document not found
        logger.warning(f"Document with id '{document_id}' not found in database")
        return None, None
    
    except Exception as e:
        error_msg = f"Failed to query document content: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return None, None


def format_structured_data(structured: Dict[str, Any]) -> str:
    """
    Convert structured content (from Excel files) into a readable string format.
    
    Takes the preview_rows from content_structured and converts each row to a text format.
    Returns a single string with all rows formatted.
    
    Note: Supabase automatically parses JSONB fields as Python dicts, so structured
    is already a dict, not a JSON string.
    
    Args:
        structured: The content_structured dict with keys:
            - preview_rows: List of dicts, where each dict represents a row
            - columns: List of column names (optional)
    
    Returns:
        String containing all rows formatted as:
        "Row 1: column1=value1 | column2=value2 | ...\nRow 2: ..."
    """
    if not structured or not isinstance(structured, dict):
        return ""
    
    preview_rows = structured.get("preview_rows", [])
    if not preview_rows or not isinstance(preview_rows, list):
        return ""
    
    columns = structured.get("columns", [])
    
    # Convert all rows to text format
    row_texts = []
    for row_idx, row in enumerate(preview_rows, start=1):
        if not isinstance(row, dict):
            continue
        
        # Convert row dict to text format: "column1=value1 | column2=value2 | ..."
        row_parts = []
        for col in columns:
            value = row.get(col, "")
            # Format value: handle None, convert to string
            if value is None:
                value_str = "N/A"
            else:
                value_str = str(value)
            
            row_parts.append(f"{col}={value_str}")
        
        # If no columns metadata, use all keys from the row
        if not row_parts:
            row_parts = [f"{k}={v}" for k, v in row.items() if v is not None]
        
        row_text = f"Row {row_idx}: {' | '.join(row_parts)}"
        row_texts.append(row_text)
    
    # Join all rows with newline separator (no chunking needed for direct injection)
    return "\n".join(row_texts)


def extract_tool_calls(msg: AIMessage) -> List[Dict[str, Any]]:
    """
    Extract tool calls from an AIMessage.
    
    Args:
        msg: The AIMessage to extract tool calls from
    
    Returns:
        List of tool call dictionaries with keys: id, name, args
    """
    if hasattr(msg, "tool_calls") and msg.tool_calls:
        return msg.tool_calls

    # provider fallback: sometimes msg.content is a list of blocks
    content = getattr(msg, "content", None)
    calls = []
    if isinstance(content, list):
        for block in content:
            if isinstance(block, dict) and block.get("type") == "tool_use":
                calls.append({
                    "id": block.get("id"),
                    "name": block.get("name"),
                    "args": block.get("input", {}),
                })
    return calls


def extract_tool_call(msg: AIMessage) -> Tuple[Optional[str], Optional[str], Dict[str, Any]]:
    """
    Extract the first tool call (id, name, args) from an AIMessage in a provider-agnostic way.

    This helper supports both:
    - LangChain-normalized `tool_calls`
    - Block-based content with `type == "tool_use"` (e.g., Anthropic-style messages)

    Args:
        msg: The AIMessage to extract the tool call from.

    Returns:
        A tuple of (tool_call_id, tool_name, tool_args). If no tool call is found,
        returns (None, None, {}).
    """
    # Preferred: LangChain normalized tool_calls
    if getattr(msg, "tool_calls", None):
        tc = msg.tool_calls[0]
        return tc.get("id"), tc.get("name"), (tc.get("args") or {})

    # Fallback: block-based content (common with some providers)
    content = getattr(msg, "content", None)
    if isinstance(content, list):
        for block in content:
            if isinstance(block, dict) and block.get("type") == "tool_use":
                return block.get("id"), block.get("name"), (block.get("input") or {})

    return None, None, {}


def is_write_sql(sql: str) -> bool:
    """
    Check if a SQL query is a write operation (INSERT, UPDATE, DELETE, etc.).
    
    Args:
        sql: The SQL query string to check
    
    Returns:
        True if the query is a write operation, False otherwise
    """
    s = (sql or "").strip().lower()
    # allow WITH ... SELECT (common)
    if s.startswith("with"):
        return " select " not in f" {s} " and not s.endswith("select")
    return s.startswith(WRITE_PREFIXES)


def serialize_pydantic_model(obj: Any) -> Any:
    """
    Serialize a Pydantic model or nested structure to a JSON-serializable dict.
    
    Handles:
    - Pydantic v2 models (uses model_dump())
    - Pydantic v1 models (uses dict())
    - Lists of Pydantic models
    - Nested Pydantic models
    - Already serialized dicts
    
    Args:
        obj: The Pydantic model or structure to serialize
    
    Returns:
        A JSON-serializable dict or list
    """
    # If it's already a dict or primitive, return as-is
    if isinstance(obj, (str, int, float, bool, type(None))):
        return obj
    
    if isinstance(obj, dict):
        return {k: serialize_pydantic_model(v) for k, v in obj.items()}
    
    if isinstance(obj, list):
        return [serialize_pydantic_model(item) for item in obj]
    
    # Try Pydantic v2 (model_dump)
    if hasattr(obj, 'model_dump'):
        return obj.model_dump()
    
    # Try Pydantic v1 (dict)
    if hasattr(obj, 'dict'):
        return obj.dict()
    
    # Fallback: try to convert to dict if it has __dict__
    if hasattr(obj, '__dict__'):
        return serialize_pydantic_model(obj.__dict__)
    
    # Last resort: convert to string
    return str(obj)


def _parse_markdown_lines(md: str) -> List[Dict[str, Any]]:
    """
    Parse markdown into structured lines with formatting information.
    Returns a list of dicts with 'text', 'type' (heading, list, paragraph), and 'level' (for headings).
    """
    md = md or ""
    md = re.sub(r"\r\n", "\n", md)
    lines = []
    
    for line in md.split("\n"):
        line = line.rstrip()
        if not line:
            lines.append({"text": "", "type": "blank", "level": 0})
            continue
        
        # Check for headings
        heading_match = re.match(r"^(#{1,6})\s+(.+)$", line)
        if heading_match:
            level = len(heading_match.group(1))
            text = heading_match.group(2).strip()
            lines.append({"text": text, "type": "heading", "level": level})
            continue
        
        # Check for list items (numbered or bulleted)
        list_match = re.match(r"^(\s*)([-*+]|\d+\.)\s+(.+)$", line)
        if list_match:
            indent = len(list_match.group(1))
            text = list_match.group(3).strip()
            lines.append({"text": text, "type": "list", "level": indent // 2, "marker": list_match.group(2)})
            continue
        
        # Check for bold text
        text = line
        # Remove code ticks
        text = re.sub(r"`{1,3}([^`]+)`{1,3}", r"\1", text)
        # Keep bold markers for now (we'll handle them in PDF rendering)
        lines.append({"text": text, "type": "paragraph", "level": 0})
    
    return lines


def markdown_to_pdf_bytes(md: str) -> bytes:
    """
    Render markdown as a properly formatted multi-page PDF.
    Preserves headings, lists, and basic formatting.
    """
    parsed_lines = _parse_markdown_lines(md)
    
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=LETTER)
    
    width, height = LETTER
    left = 0.75 * inch
    right = width - 0.75 * inch
    top = height - 0.75 * inch
    bottom = 0.75 * inch
    y = top
    
    # Font sizes
    heading_sizes = {1: 18, 2: 16, 3: 14, 4: 12, 5: 11, 6: 11}
    normal_font_size = 11
    list_indent = 0.25 * inch
    
    def wrap_text(text: str, max_width: float, font_name: str, font_size: int) -> List[str]:
        """Wrap text to fit within max_width."""
        words = text.split()
        lines = []
        current_line = []
        current_width = 0
        
        for word in words:
            # Check if word contains bold markers
            word_clean = re.sub(r"\*\*([^*]+)\*\*", r"\1", word)
            word_width = c.stringWidth(word_clean, font_name, font_size)
            
            if current_width + word_width + (c.stringWidth(" ", font_name, font_size) if current_line else 0) > max_width:
                if current_line:
                    lines.append(" ".join(current_line))
                    current_line = [word]
                    current_width = word_width
                else:
                    # Word is too long, split it
                    lines.append(word_clean)
                    current_line = []
                    current_width = 0
            else:
                current_line.append(word)
                current_width += word_width + (c.stringWidth(" ", font_name, font_size) if len(current_line) > 1 else 0)
        
        if current_line:
            lines.append(" ".join(current_line))
        
        return lines if lines else [""]
    
    def draw_text_with_bold(text: str, x: float, y: float, font_name: str, font_size: int, is_bold: bool = False):
        """Draw text, handling bold markers."""
        # Split text by bold markers
        parts = re.split(r"(\*\*[^*]+\*\*)", text)
        current_x = x
        
        for part in parts:
            if part.startswith("**") and part.endswith("**"):
                # Bold text
                bold_text = part[2:-2]
                c.setFont("Times-Bold", font_size)
                c.drawString(current_x, y, bold_text)
                current_x += c.stringWidth(bold_text, "Times-Bold", font_size)
            else:
                # Normal text
                c.setFont(font_name, font_size)
                c.drawString(current_x, y, part)
                current_x += c.stringWidth(part, font_name, font_size)
    
    def new_page_if_needed(required_space: float = 20):
        """Check if we need a new page and create one if needed."""
        nonlocal y
        if y - required_space < bottom:
            c.showPage()
            y = top
            return True
        return False
    
    for line_info in parsed_lines:
        if line_info["type"] == "blank":
            if not new_page_if_needed(14):
                y -= 14
            continue
        
        line_text = line_info["text"]
        line_type = line_info["type"]
        line_level = line_info.get("level", 0)
        
        if line_type == "heading":
            font_size = heading_sizes.get(line_level, normal_font_size)
            font_name = "Times-Bold"
            spacing_before = 20 if line_level <= 2 else 14
            spacing_after = 12
            
            if not new_page_if_needed(spacing_before + font_size + spacing_after):
                y -= spacing_before
                draw_text_with_bold(line_text, left, y, font_name, font_size, is_bold=True)
                y -= font_size + spacing_after
        
        elif line_type == "list":
            font_size = normal_font_size
            font_name = "Times-Roman"
            indent = left + (list_indent * line_level)
            marker = line_info.get("marker", "-")
            
            # Wrap list item text
            max_width = right - indent - 20
            wrapped = wrap_text(line_text, max_width, font_name, font_size)
            
            for i, wrapped_line in enumerate(wrapped):
                if not new_page_if_needed(font_size + 4):
                    if i == 0:
                        # Draw marker for first line
                        marker_text = f"{marker} "
                        c.setFont(font_name, font_size)
                        c.drawString(indent, y, marker_text)
                        text_x = indent + c.stringWidth(marker_text, font_name, font_size)
                    else:
                        # Indent continuation lines
                        text_x = indent + list_indent
                    
                    draw_text_with_bold(wrapped_line, text_x, y, font_name, font_size)
                    y -= font_size + 4
        
        else:  # paragraph
            font_size = normal_font_size
            font_name = "Times-Roman"
            
            # Wrap paragraph text
            max_width = right - left
            wrapped = wrap_text(line_text, max_width, font_name, font_size)
            
            for wrapped_line in wrapped:
                if not new_page_if_needed(font_size + 4):
                    draw_text_with_bold(wrapped_line, left, y, font_name, font_size)
                    y -= font_size + 4
    
    c.save()
    buffer.seek(0)
    return buffer.read()


def upload_pdf_and_get_signed_url(
    *,
    bucket: str,
    pdf_bytes: bytes,
    storage_path: str,
    expires_in: int = 3600
) -> str:
    """Upload PDF to Supabase storage and return a signed URL."""
    supabase = get_supabase_client()
    storage = supabase.storage.from_(bucket)
    
    # Upload
    storage.upload(
        path=storage_path,
        file=pdf_bytes,
        file_options={
            "content-type": "application/pdf",
            "upsert": "true",
        },
    )
    
    # Signed URL
    signed = storage.create_signed_url(storage_path, expires_in)
    
    # supabase-py versions differ slightly in key casing
    return (
        signed.get("signedURL")
        or signed.get("signedUrl")
        or signed.get("signed_url")
        or ""
    )


def create_document(employee_id: str, filename: str, content_markdown: str) -> Optional[str]:
    """
    Create a document by converting markdown to PDF and uploading to Supabase storage.
    
    Args:
        employee_id: The employee ID
        filename: The filename for the document
        content_markdown: The markdown content of the document
    
    Returns:
        Signed URL to the uploaded PDF, or None if upload fails
    """
    try:
        # Get bucket name from environment
        bucket = os.getenv("SUPABASE_ONBOARDING_DOCS_BUCKET")
        if not bucket:
            logger.error("SUPABASE_ONBOARDING_DOCS_BUCKET not found in environment variables")
            return None
        
        # Convert markdown to PDF bytes
        pdf_bytes = markdown_to_pdf_bytes(content_markdown)
        
        # Construct storage path: <bucket>/<employee_id>/<filename>
        # Ensure filename has .pdf extension
        if not filename.endswith('.pdf'):
            filename = filename.replace('.md', '.pdf')
        
        storage_path = f"{employee_id}/{filename}"
        
        # Upload and get signed URL
        signed_url = upload_pdf_and_get_signed_url(
            bucket=bucket,
            pdf_bytes=pdf_bytes,
            storage_path=storage_path,
            expires_in=3600  # 1 hour
        )
        
        logger.info(f"Document uploaded successfully: {storage_path}")
        return signed_url
        
    except Exception as e:
        logger.error(f"Error creating document {filename} for employee {employee_id}: {str(e)}", exc_info=True)
        return None


    