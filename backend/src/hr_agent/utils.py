"""
Utility functions for the HR Agent
"""

import logging
from typing import Tuple, Optional, Dict, Any, List

from langchain_core.messages import AIMessage
from src.services.helpers import get_supabase_client

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
