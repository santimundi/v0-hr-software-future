"""
Tools for the HR Agent
"""

import logging
from typing import Any, Dict
from langchain_core.tools import tool

from src.services.helpers import get_supabase_client
from src.hr_agent.utils import get_employee_document_content, format_structured_data
from src.core.audit_helpers import *


logger = logging.getLogger(__name__)

@tool
def get_document_context(document_id: str) -> str:
    """
    Get the full content of an employee document by its ID (UUID).
    
    Returns formatted text content for PDFs/text files and formatted structured data for Excel files.
    Use this when you have a document ID and need to read its contents to answer questions about it.
    
    Args:
        document_id: The UUID of the employee document to retrieve content from
    
    Returns:
        Formatted string containing:
        - Document text content (for PDFs/text files)
        - Structured data rows (for Excel files) formatted as "Row N: column1=value1 | column2=value2 | ..."
    """
    # Fetch document metadata for audit logging
    document_title = None
    owner_employee_id = None
    try:
        supabase = get_supabase_client()
        response = supabase.table("employee_documents").select("title, owner_employee_id").eq("id", document_id).execute()
        if response.data and len(response.data) > 0:
            document_title = response.data[0].get("title")
            owner_employee_id = response.data[0].get("owner_employee_id")
    except Exception:
        pass  # Continue even if metadata fetch fails
    
    # Log document access
    audit_document_accessed(
        document_id,
        document_title=document_title,
        owner_employee_id=owner_employee_id,
        reason="Answer user query",
        scope="documents"
    )
    
    content_text, content_structured = get_employee_document_content(document_id)
    
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
    Query the employee_documents table to list the documents for a given employee ID.
    
    Args:
        employee_id: The text employee ID (e.g., "EMP000005"), NOT the UUID
        limit: The maximum number of documents to list
    
    Returns:
        A list of employee document IDs and their corresponding names, or an error dict
    """
    try:
        supabase = get_supabase_client()

        # Validate that employee_id is not a UUID (UUIDs are 36 chars with dashes)
        # Text employee_ids are typically shorter (e.g., "EMP000005")
        if len(employee_id) > 20 or '-' in employee_id:
            error_msg = f"Invalid employee_id format. Expected text format (e.g., 'EMP000005'), but received what appears to be a UUID: '{employee_id}'. Please use the text employee_id, not the UUID."
            logger.error(error_msg)
            return {"error": error_msg}

        # get the employee uuid from the employees table
        response = supabase.table("employees").select("id").eq("employee_id", employee_id).execute()
        if hasattr(response, 'error') and response.error:
            error_msg = f"Database query error: {response.error}"
            logger.error(error_msg)
            return {"error": error_msg}
        
        # Check if employee was found
        if not response.data or len(response.data) == 0:
            error_msg = f"Employee with employee_id '{employee_id}' not found"
            logger.error(error_msg)
            return {"error": error_msg}
        
        employee_uuid = response.data[0].get("id")

        logger.info(f"list_employee_documents - Resolved employee_id '{employee_id}' to UUID: {employee_uuid}")

        # query the employee_documents table to list the documents for the employee
        response = supabase.table("employee_documents").select("id, title").eq("owner_employee_id", employee_uuid).limit(limit).execute()
        
        if hasattr(response, 'error') and response.error:
            error_msg = f"Database query error: {response.error}"
            logger.error(error_msg)
            return {"error": error_msg}

        logger.info(f"list_employee_documents - Documents query response: {response.data}")
        
        # Log document listing access
        document_ids = [doc.get("id") for doc in response.data] if response.data else []
        document_titles = [doc.get("title") for doc in response.data] if response.data else []
        audit_documents_listed(employee_id, document_ids, document_titles)

        return response.data

    except Exception as e:
        error_msg = f"Failed to list employee documents: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        # Log tool error
        audit_tool_error_simple("list_employee_documents", e)
        
        return {"error": error_msg}


@tool
def list_company_policies(limit: int = 25) -> Dict[str, Any]:
    """
    Query the policies table to list the policies for the company.
    
    Args:
        limit: The maximum number of policies to list
    
    Returns:
        A list of policy IDs and their corresponding names
    """
    try:
        logger.info(f"list_company_policies - Listing company policies with limit: {limit}")
        supabase = get_supabase_client()
        response = supabase.table("company_docs_and_policies").select("id, title").limit(limit).execute()
        if hasattr(response, 'error') and response.error:
            error_msg = f"Database query error: {response.error}"
            logger.error(error_msg)
            audit_tool_error_simple("list_company_policies", Exception(error_msg))
            return []
        
        logger.info(f"list_company_policies - Policies query response: {response.data}")
        
        # Log policy listing access
        policy_ids = [policy.get("id") for policy in response.data] if response.data else []
        policy_titles = [policy.get("title") for policy in response.data] if response.data else []
        audit_policies_listed(policy_ids, policy_titles)
        
        return response.data
    except Exception as e:
        error_msg = f"Failed to list company policies: {str(e)}"
        logger.error(error_msg, exc_info=True)
        audit_tool_error_simple("list_company_policies", e)
        return []


@tool
def get_company_policy_context(policy_id: str) -> str:
    """
    Get the full content of a company policy by its ID (UUID).
    
    Returns formatted text content for PDFs/text files and formatted structured data for Excel files.
    Use this when you have a policy ID and need to read its contents to answer questions about it.
    
    Args:
        policy_id: The UUID of the company policy to retrieve content from
    """
    # Fetch policy metadata for audit logging
    policy_title = None
    try:
        supabase = get_supabase_client()
        response = supabase.table("company_docs_and_policies").select("title, content").eq("id", policy_id).execute()
        if hasattr(response, 'error') and response.error:
            error_msg = f"Database query error: {response.error}"
            logger.error(error_msg)
            audit_tool_error_simple("get_company_policy_context", Exception(error_msg))
            return "Policy not found or error retrieving content."
        
        if response.data and len(response.data) > 0:
            policy_title = response.data[0].get("title")
            content = response.data[0].get("content", "")
            
            # Log policy access
            audit_policy_accessed(
                policy_id,
                policy_title=policy_title,
                reason="Answer user query",
                scope="policies"
            )
            
            logger.info(f"get_company_policy_context - Retrieved policy '{policy_title}' (id: {policy_id})")
            return content if content else "Policy has no content."
        else:
            logger.warning(f"get_company_policy_context - Policy not found: {policy_id}")
            return "Policy not found."
    except Exception as e:
        error_msg = f"Failed to get company policy context: {str(e)}"
        logger.error(error_msg, exc_info=True)
        audit_tool_error_simple("get_company_policy_context", e)
        return "Error retrieving policy content."


def get_rag_tools():
    return [get_document_context, list_employee_documents, list_company_policies, get_company_policy_context]