"""
Utility functions for RAG operations to retrieve document content from Supabase.

Note: These are utility functions, not LangChain tools. For actual LangChain tools,
see the MCP tools in src.core.mcp.supabase.
"""

import logging
from typing import List, Tuple, Optional, Dict, Any

from src.services.helpers import get_supabase_client
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

def get_content(document_id: str) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    """
    Query the documents_1 table to get the content_text and content_structured fields for a document.
    
    Args:
        document_id: The UUID of the document to retrieve
    
    Returns:
        Tuple of (content_text, content_structured):
        - content_text (str, optional): The extracted text content of the document
        - content_structured (dict, optional): The structured content (for Excel files) or None
    """
    try:
        supabase = get_supabase_client()
        
        logger.info(f"Querying documents_1 table for document_id: {document_id}")
        
        # Query documents_1 table for the specific document
        response = supabase.table("documents_1").select("content, content_structured").eq("id", document_id).execute()
        
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

@tool
def get_document_context(document_id: str) -> str:
    """
    Get the full content of a document by its ID (UUID).
    
    Returns formatted text content for PDFs/text files and formatted structured data for Excel files.
    Use this when you have a document ID and need to read its contents to answer questions about it.
    
    Args:
        document_id: The UUID of the document to retrieve content from
    
    Returns:
        Formatted string containing:
        - Document text content (for PDFs/text files)
        - Structured data rows (for Excel files) formatted as "Row N: column1=value1 | column2=value2 | ..."
    """
    content_text, content_structured = get_content(document_id)
    
    # Format for LLM
    formatted_context = content_text if content_text else ""
    if content_structured:
        structured_text = format_structured_data(content_structured)
        if structured_text:
            formatted_context += "\n\nStructured Data:\n" + structured_text
    
    return formatted_context if formatted_context else "Document not found or has no content."

