"""
Tools for the HR Agent
"""

import logging
from typing import Any, Dict
from langchain_core.tools import tool

from src.services.helpers import get_supabase_client
from src.hr_agent.utils import get_content, format_structured_data


logger = logging.getLogger(__name__)

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

@tool
def list_employee_documents(employee_id: str, limit: int = 25) -> Dict[str, Any]:
    """
    Query the documents_1 table to list the documents for a given employee ID.
    
    Args:
        employee_id: The ID of the employee to list documents for
        limit: The maximum number of documents to list
    
    Returns:
        A list of document IDs and their corresponding names
    """
    try:
        supabase = get_supabase_client()

        # get the employee uuid from the employees table
        response = supabase.table("employees").select("id").eq("employee_id", employee_id).execute()
        if hasattr(response, 'error') and response.error:
            error_msg = f"Database query error: {response.error}"
            logger.error(error_msg)
            return []
        employee_uuid = response.data[0].get("id")

        logger.info(f"list_employee_documents - Resolved employee_id '{employee_id}' to UUID: {employee_uuid}")

        # query the documents_1 table to list the documents for the employee
        response = supabase.table("documents_1").select("id, title").eq("owner_employee_id", employee_uuid).limit(limit).execute()
        
        if hasattr(response, 'error') and response.error:
            error_msg = f"Database query error: {response.error}"
            logger.error(error_msg)
            return []

        logger.info(f"list_employee_documents - Documents query response: {response.data}")

        return response.data

    except Exception as e:
        error_msg = f"Failed to list employee documents: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return []

