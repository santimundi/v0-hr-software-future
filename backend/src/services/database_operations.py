"""
Database and file processing operations.

This module contains operations for:
- File content extraction (PDF, text, Excel)
- Employee UUID lookup from database
- File storage uploads
- Document insertion into database
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple

from src.core.file_readers import read_pdf, read_text_file, read_excel
from .helpers import get_supabase_client, guess_content_type, make_storage_path, BUCKET

logger = logging.getLogger(__name__)


def read_file(filename: str, file_bytes: bytes) -> Dict[str, Any]:
    """
    Read and extract content from a file based on its extension.
    
    Supports:
    - PDF files (.pdf)
    - Text files (.txt, .md)
    - Excel files (.xlsx, .xlsm, .xls)
    
    Args:
        filename: Name of the file (with extension)
        file_bytes: File content as bytes
    
    Returns:
        Dictionary with:
        - "content_text" (str): Extracted text content
        - "content_structured" (dict, optional): Structured data (for Excel files)
        - "warnings" (list): List of warning messages
    """
    lower = filename.lower()
    
    if lower.endswith(".pdf"):
        response = read_pdf(file_bytes)
    elif lower.endswith(".txt") or lower.endswith(".md"):
        response = read_text_file(file_bytes)
    elif lower.endswith(".xlsx") or lower.endswith(".xlsm") or lower.endswith(".xls"):
        response = read_excel(file_bytes)
    else:
        response = {
            "kind": "unknown",
            "content_text": "",
            "content_structured": None,
            "warnings": ["File extension not recognized"],
        }
    
    return {
        "content_text": response.get("content_text", ""),
        "content_structured": response.get("content_structured", None),
        "warnings": response.get("warnings", []),
    }


def get_employee_uuid(employee_id: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Query the employees table to get the UUID of an employee by their employee_id.
    
    Args:
        employee_id: The employee ID to look up (e.g., "EMP-005")
    
    Returns:
        Tuple of (uuid, error):
        - uuid (str, optional): The UUID of the employee if found
        - error (str, optional): Error message if query failed or employee not found
    """
    try:
        supabase = get_supabase_client()
        
        # Normalize employee_id by removing dashes (backend stores as 'EMP001', frontend may send 'EMP-001')
        normalized_employee_id = employee_id.replace("-", "")
        
        logger.info(f"Querying employees table for employee_id: {employee_id} (normalized: {normalized_employee_id})")
        
        # Query employees table where employee_id matches
        response = supabase.table("employees").select("id").eq("employee_id", normalized_employee_id).execute()
        
        # Check for errors
        if hasattr(response, 'error') and response.error:
            error_msg = f"Database query error: {response.error}"
            logger.error(error_msg)
            return None, error_msg
        
        # Extract UUID from response
        if hasattr(response, 'data') and response.data and len(response.data) > 0:
            employee_uuid = response.data[0].get("id")
            if employee_uuid:
                logger.info(f"Found employee UUID: {employee_uuid} for employee_id: {employee_id}")
                return str(employee_uuid), None
        
        # Employee not found
        error_msg = f"Employee with employee_id '{employee_id}' not found"
        logger.warning(error_msg)
        return None, error_msg
    
    except Exception as e:
        error_msg = f"Failed to query employee UUID: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return None, error_msg


def upload_to_storage(employee_uuid: str, filename: str, file_bytes: bytes) -> Tuple[Optional[str], Optional[str]]:
    """
    Upload a file to a PRIVATE Supabase Storage bucket.
    
    Args:
        employee_uuid: UUID of the employee who owns/uploaded the document
        filename: Original filename of the file being uploaded
        file_bytes: The file content as bytes
    
    Returns:
        Tuple of (file_path, error):
        - file_path (str, optional): The storage path of the uploaded file if successful
        - error (str, optional): Error message if upload failed
    """
    try:
        supabase = get_supabase_client()
        
        # Generate storage path
        path = make_storage_path(employee_uuid, filename)
        
        # Guess content type from filename
        content_type = guess_content_type(filename)
        
        logger.info(f"Uploading file to storage: bucket={BUCKET}, path={path}, content_type={content_type}")
        
        # Upload to Supabase Storage
        response = supabase.storage.from_(BUCKET).upload(
            path=path,
            file=file_bytes,
            file_options={
                "content-type": content_type
            }
        )
        
        # Check for errors in response
        if isinstance(response, dict) and response.get("error"):
            error_msg = f"Storage upload error: {response['error']}"
            logger.error(error_msg)
            return None, error_msg
        
        logger.info(f"Successfully uploaded file to storage: {path}")
        return path, None
    
    except Exception as e:
        error_msg = f"Failed to upload file to storage: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return None, error_msg


def insert_into_table(table_name: str, document_data: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[str], Optional[Dict[str, Any]]]:
    """
    Insert a row into the specified table.
    
    Args:
        document_data: Dictionary containing document fields:
            - owner_employee_id (str): UUID of the employee who owns the document
            - content (str): Extracted text content
            - content_structured (dict, optional): Structured content (for Excel files)
            - uploaded_by (str): Name of the employee who uploaded the document
            - title (str): Document title
            - ai_summary (str): AI-generated summary
            - file_url (str): Storage path of the uploaded file
            - created_at (str): ISO timestamp of creation
    
    Returns:
        Tuple of (success, document_id, error, inserted_data):
        - success (bool): Whether the insert was successful
        - document_id (str, optional): The ID of the inserted document if successful
        - error (str, optional): Error message if insert failed
        - inserted_data (dict, optional): The inserted row data if successful
    """
    try:
        supabase = get_supabase_client()
        
        # Add created_at if not provided
        if "created_at" not in document_data:
            document_data["created_at"] = datetime.now(timezone.utc).isoformat()
        
        logger.info(f"Inserting document into 'documents_1' table with fields: {list(document_data.keys())}")
        
        # Insert the row
        response = supabase.table("documents_1").insert(document_data).execute()
        
        # Check for errors
        if hasattr(response, 'error') and response.error:
            error_msg = f"Database insert error: {response.error}"
            logger.error(error_msg)
            return False, None, error_msg, None
        
        # Extract inserted data
        if hasattr(response, 'data') and response.data:
            inserted_row = response.data[0] if isinstance(response.data, list) else response.data
            inserted_id = inserted_row.get("id") if isinstance(inserted_row, dict) else None
            
            logger.info(f"Successfully inserted document with id: {inserted_id}")
            return True, inserted_id, None, inserted_row
        else:
            # No data returned but no error - might be successful but empty response
            logger.warning("Insert into 'documents_1' completed but no data returned")
            return True, None, None, None
    
    except Exception as e:
        error_msg = f"Failed to insert document: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return False, None, error_msg, None

