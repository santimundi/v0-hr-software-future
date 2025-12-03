"""
Tools for the HR Agent
"""

from langchain_core.tools import tool

from src.hr_agent.utils import get_content, format_structured_data

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

