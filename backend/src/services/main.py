"""
Document service for orchestrating document upload workflows.

This module provides the main DocumentService class that orchestrates
all document processing operations in a single workflow.
"""

import logging
from typing import Dict, Any, Optional

from langchain_core.language_models import BaseChatModel

from .database_operations import *
from .helpers import generate_summary

logger = logging.getLogger(__name__)


class DocumentService:
    """
    Service class for document processing operations.
    
    Handles orchestration of all document upload workflows:
    - File content extraction (PDF, text, Excel)
    - Employee UUID lookup
    - File storage uploads
    - Database document insertion
    - Document summarization (LLM-based)
    """
    
    def __init__(self):
        """Initialize the document service."""
        pass
    
    async def process_document_upload(
        self,
        employee_id: str,
        employee_name: str,
        filename: str,
        file_bytes: bytes,
    ) -> Dict[str, Any]:
        """
        Process a complete document upload workflow.
        
        This method orchestrates all the steps:
        1. Read file content
        2. Get employee UUID
        3. Upload file to storage
        4. Generate summary (if LLM provided)
        5. Insert document into database
        
        Args:
            employee_id: Employee ID (e.g., "EMP-005")
            employee_name: Name of the employee uploading the document
            filename: Name of the file being uploaded
            file_bytes: File content as bytes
        
        Returns:
            Dictionary with:
            - "success" (bool): Whether the upload was successful
            - "status_code" (int): HTTP status code (200 for success, error codes otherwise)
            - "message" (str): Success or error message
            - "document_id" (str, optional): ID of the inserted document if successful
        """
        try:
            # Step 1: Read file content
            file_data = read_file(filename, file_bytes)
            content_text = file_data["content_text"]
            content_structured = file_data["content_structured"]
            
            # Step 2: Get employee UUID
            employee_uuid, error = get_employee_uuid(employee_id)
            if error:
                return {
                    "success": False,
                    "status_code": 404,
                    "message": f"Employee not found: {error}",
                    "document_id": None
                }
            
            # Step 3: Upload to storage
            file_path, error = upload_to_storage(employee_uuid, filename, file_bytes)
            if error:
                return {
                    "success": False,
                    "status_code": 500,
                    "message": f"Storage upload failed: {error}",
                    "document_id": None
                }
            
            # Step 4: Generate summary
            title, ai_summary = generate_summary(content_text, filename)
            
            # Step 5: Insert document into database
            document_data = {
                "owner_employee_id": employee_uuid,
                "content": content_text,
                "content_structured": content_structured,
                "uploaded_by": employee_name,
                "title": title,
                "ai_summary": ai_summary,
                "file_url": file_path,
            }
            
            success, document_id, error, _ = insert_into_table("documents_1", document_data)
            
            if success:
                return {
                    "success": True,
                    "status_code": 200,
                    "message": "Document successfully uploaded and inserted",
                    "document_id": document_id
                }
            else:
                # Determine appropriate error code based on error type
                if "not found" in error.lower() or "does not exist" in error.lower():
                    status_code = 404
                elif "validation" in error.lower() or "invalid" in error.lower() or "constraint" in error.lower():
                    status_code = 400
                else:
                    status_code = 500
                
                return {
                    "success": False,
                    "status_code": status_code,
                    "message": f"Failed to insert document: {error}",
                    "document_id": None
                }
        
        except Exception as e:
            error_msg = f"Document upload processing failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {
                "success": False,
                "status_code": 500,
                "message": error_msg,
                "document_id": None
            }

