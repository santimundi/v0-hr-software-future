"""
Helper functions for Supabase client, storage operations, and LLM summarization.

This module provides:
- Supabase client initialization
- Storage path and content type utilities
- Document summarization using LLM
"""

import logging
import mimetypes
import os
from datetime import datetime, timezone
from typing import Tuple

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from supabase import create_client, Client
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

load_dotenv(".env.local")

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET = os.getenv("SUPABASE_DOCS_BUCKET")

# Initialize Supabase client (using service role key for admin operations)
_supabase_admin: Client | None = None

# Document summarization prompt
SUMMARY_PROMPT = """Generate a title and summary for the document.

**Title**: Create a clean title from the filename by removing extensions, replacing underscores/hyphens with spaces, and capitalizing properly.

**Summary**: Generate a one-line summary (max 200 characters) describing what the document is about, based on the file content and filename.

Return structured output with `title` and `ai_summary` fields.""".rstrip()

class SummaryOutput(BaseModel):
    ai_summary: str = Field(description="One-line AI-generated summary of the document")
    title: str = Field(description="A simple one line ai generated title of the document")



def get_supabase_client() -> Client:
    """
    Get or create Supabase admin client instance (singleton pattern).
    
    Returns:
        Supabase client instance
        
    Raises:
        ValueError: If Supabase credentials are not found
    """
    global _supabase_admin
    if _supabase_admin is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError(
                "Supabase credentials not found. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
            )
        _supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_admin


def guess_content_type(filename: str) -> str:
    """
    Guess the MIME content type from filename.
    
    Args:
        filename: The filename to guess content type for
    
    Returns:
        MIME type string, defaults to "application/octet-stream" if unknown
    """
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or "application/octet-stream"


def make_storage_path(employee_uuid: str, filename: str) -> str:
    """
    Generate a storage path for the file.
    
    Format: employees/{employee_uuid}/{timestamp}_{safe_filename}
    
    Args:
        employee_uuid: UUID of the employee who owns the document
        filename: Original filename
    
    Returns:
        Storage path string
    """
    # Generate UTC timestamp in ISO format (YYYYMMDDTHHMMSSZ)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    
    # Sanitize filename: strip whitespace and replace spaces with underscores
    safe = filename.strip().replace(" ", "_")
    
    return f"employees/{employee_uuid}/{ts}_{safe}"



def generate_summary(
    file_content: str, 
    filename: str
) -> Tuple[str, str]:
    """
    Generate a title and summary for a document using an LLM.
    
    Args:
        file_content: The extracted text content of the file
        filename: The name of the file
    
    Returns:
        Tuple of (title, summary):
        - title (str): Generated document title
        - summary (str): Generated one-line summary (max 200 characters)
    """
    llm = ChatGroq(model="openai/gpt-oss-120b", api_key=os.getenv("GROQ_API_KEY"))
    llm_with_structured_output = llm.with_structured_output(SummaryOutput)
    
    messages = [
        SystemMessage(content=SUMMARY_PROMPT),
        HumanMessage(content=f"File Content: {file_content}, Filename: {filename}"),
    ]
    
    response = llm_with_structured_output.invoke(messages)
    
    return response.title, response.ai_summary

