"""
Tools for the database agent to handle file uploads to Supabase Storage.
"""

import logging
import mimetypes
import os
from datetime import datetime, timezone
from typing import Dict, Any

from dotenv import load_dotenv
from langchain_core.tools import tool
from supabase import create_client, Client

load_dotenv(".env.local")

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET = os.getenv("SUPABASE_DOCS_BUCKET")

# Initialize Supabase client (using service role key for admin operations)
_supabase_admin: Client | None = None


def _get_supabase_client() -> Client:
    """Get or create Supabase admin client instance."""
    global _supabase_admin
    if _supabase_admin is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError(
                "Supabase credentials not found. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ACCESS_TOKEN"
            )
        _supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_admin


def _guess_content_type(filename: str) -> str:
    """
    Guess the MIME content type from filename.
    
    Args:
        filename: The filename to guess content type for
    
    Returns:
        MIME type string, defaults to "application/octet-stream" if unknown
    """
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or "application/octet-stream"


def _make_storage_path(employee_id: str, filename: str) -> str:
    """
    Generate a storage path for the file.
    
    Format: employees/{employee_id}/{timestamp}_{safe_filename}
    
    Args:
        employee_id: UUID of the employee who owns the document
        filename: Original filename
    
    Returns:
        Storage path string
    """
    # Generate UTC timestamp in ISO format (YYYYMMDDTHHMMSSZ)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    
    # Sanitize filename: strip whitespace and replace spaces with underscores
    safe = filename.strip().replace(" ", "_")
    
    return f"employees/{employee_id}/{ts}_{safe}"


def upload_to_private_bucket(employee_id: str, filename: str, file_bytes: bytes) -> Dict[str, Any]:
    """
    Upload a file to a PRIVATE Supabase Storage bucket using the service role key.
    
    This tool uploads files to Supabase Storage in a private bucket. The file is stored
    in a path organized by employee ID and timestamp to ensure uniqueness and organization.
    
    Args:
        employee_id: UUID of the employee who owns/uploaded the document
        filename: Original filename of the file being uploaded
        file_bytes: The file content as bytes
    
    Returns:
        Dictionary with:
        - "bucket" (str): The bucket name where the file was stored
        - "path" (str): The storage path of the uploaded file
        - "content_type" (str): The detected MIME type of the file
        - "success" (bool): Whether the upload was successful
        - "error" (str, optional): Error message if upload failed
  
    """
    try:
        # Get Supabase admin client
        supabase = _get_supabase_client()
        
        # Generate storage path
        path = _make_storage_path(employee_id, filename)
        
        # Guess content type from filename
        content_type = _guess_content_type(filename)
        
        logger.info(f"Uploading file to storage: bucket={BUCKET}, path={path}, content_type={content_type}")
        
        # Upload to Supabase Storage
        # Note: If file exists, it will be overwritten (Supabase storage behavior)
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
            return {
                "bucket": BUCKET,
                "path": path,
                "content_type": content_type,
                "success": False,
                "error": error_msg
            }
        
        logger.info(f"Successfully uploaded file to storage: {path}")
        
        return {
            "bucket": BUCKET,
            "path": path,
            "content_type": content_type,
            "success": True
        }
    
    except Exception as e:
        error_msg = f"Failed to upload file to storage: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {
            "bucket": BUCKET,
            "path": "",
            "content_type": "",
            "success": False,
            "error": error_msg
        }



def insert_into_table(table_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Insert a row into a Supabase database table.
    
    This tool inserts a single row into the specified table using the Supabase client.
    The data dictionary should contain field names as keys and their values as values.
    The tool will automatically handle UUID generation for primary keys if they're not provided.
    
    Args:
        table_name: The name of the table to insert into (e.g., "documents", "employees")
        data: Dictionary where keys are column names and values are the values to insert.
              Values should match the expected data types (UUIDs as strings, dates as ISO strings, etc.)
    
    Returns:
        Dictionary with:
        - "success" (bool): Whether the insert was successful
        - "id" (str, optional): The ID of the inserted row (if table has an id column)
        - "data" (dict, optional): The inserted row data
        - "error" (str, optional): Error message if insert failed
    
    """
    try:
        # Get Supabase admin client
        supabase = _get_supabase_client()
        
        logger.info(f"Inserting row into table '{table_name}' with data: {list(data.keys())}")
        
        # Insert the row
        response = supabase.table(table_name).insert(data).execute()
        
     
        
        # Check for errors
        if hasattr(response, 'error') and response.error:
            error_msg = f"Database insert error: {response.error}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg
            }
        
        # Extract inserted data
        if hasattr(response, 'data') and response.data:
            inserted_row = response.data[0] if isinstance(response.data, list) else response.data
            inserted_id = inserted_row.get("id") if isinstance(inserted_row, dict) else None
            
            logger.info(f"Successfully inserted row into '{table_name}' with id: {inserted_id}")
            
            return {
                "success": True,
                "id": inserted_id,
                "data": inserted_row
            }
        else:
            # No data returned but no error - might be successful but empty response
            logger.warning(f"Insert into '{table_name}' completed but no data returned")
            return {
                "success": True,
                "id": None,
                "data": None
            }
    
    except Exception as e:
        error_msg = f"Failed to insert into table '{table_name}': {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {
            "success": False,
            "error": error_msg
        }


def get_employee_uuid_by_id(employee_id: str) -> Dict[str, Any]:
    """
    Query the employees table to get the UUID (id) of an employee by their employee_id.
    
    This tool queries the employees table to find the UUID that corresponds to the given employee_id.
    The employee_id is typically a string like "EMP-005", and this tool returns the UUID from the id column.
    
    Args:
        employee_id: The employee ID to look up (e.g., "EMP-005")
    
    Returns:
        Dictionary with:
        - "success" (bool): Whether the query was successful
        - "uuid" (str, optional): The UUID of the employee if found
        - "error" (str, optional): Error message if query failed or employee not found
    """
    try:
        # Get Supabase admin client
        supabase = _get_supabase_client()
        
        # Normalize employee_id by removing dashes (backend stores as 'EMP001', frontend may send 'EMP-001')
        normalized_employee_id = employee_id.replace("-", "")
        
        logger.info(f"Querying employees table for employee_id: {employee_id} (normalized: {normalized_employee_id})")
        
        # Query employees table where employee_id matches (using normalized version)
        response = supabase.table("employees").select("id").eq("employee_id", normalized_employee_id).execute()
        
      
        # Check for errors
        if hasattr(response, 'error') and response.error:
            error_msg = f"Database query error: {response.error}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg
            }
        
        # Extract UUID from response
        if hasattr(response, 'data') and response.data and len(response.data) > 0:
            employee_uuid = response.data[0].get("id")
            print(f"Extracted UUID from response.data[0]: {employee_uuid}")
            if employee_uuid:
                logger.info(f"Found employee UUID: {employee_uuid} for employee_id: {employee_id}")
                return {
                    "success": True,
                    "uuid": employee_uuid
                }
        
        # Employee not found
        logger.warning(f"Employee with employee_id '{employee_id}' not found in database")
        print(f"WARNING: No employee found with employee_id '{employee_id}'")
        return {
            "success": False,
            "error": f"Employee with employee_id '{employee_id}' not found"
        }
    
    except Exception as e:
        error_msg = f"Failed to query employee UUID: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {
            "success": False,
            "error": error_msg
        }

