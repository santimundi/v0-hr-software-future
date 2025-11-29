"""
Tools for RAG agent to retrieve document content from Supabase.
"""

import logging
import os
from typing import List, Tuple, Optional, Dict, Any
from langchain_text_splitters import CharacterTextSplitter
from langchain_community.vectorstores import FAISS
from dotenv import load_dotenv
load_dotenv(".env.local")


from src.services.helpers import get_supabase_client
from langchain_openai import OpenAIEmbeddings



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


def get_row_chunks(structured: Dict[str, Any], rows_per_chunk: int = 50) -> List[str]:
    """
    Convert structured content (from Excel files) into chunked string format.
    
    Takes the preview_rows from content_structured and converts each row to a text format.
    Returns rows as chunks of specified size, separated by newlines.
    
    Note: Supabase automatically parses JSONB fields as Python dicts, so structured
    is already a dict, not a JSON string.
    
    Args:
        structured: The content_structured dict with keys:
            - preview_rows: List of dicts, where each dict represents a row
            - columns: List of column names (optional)
        rows_per_chunk: Number of rows per chunk (default: 50)
    
    Returns:
        List of strings, where each string contains rows_per_chunk rows formatted as:
        "Row 1: column1=value1 | column2=value2 | ...\nRow 2: ..."
    """
    if not structured or not isinstance(structured, dict):
        return []
    
    preview_rows = structured.get("preview_rows", [])
    if not preview_rows or not isinstance(preview_rows, list):
        return []
    
    columns = structured.get("columns", [])
    
    # Convert rows to text format
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
    
    # Group rows into chunks
    chunks = []
    total_rows = len(row_texts)
    
    for chunk_idx in range(0, total_rows, rows_per_chunk):
        chunk_rows = row_texts[chunk_idx:chunk_idx + rows_per_chunk]
        # Join rows with newline separator
        chunk_text = "\n".join(chunk_rows)
        chunks.append(chunk_text)
    
    return chunks
    

def get_context(document_id: str, user_query: str) -> Tuple[List, List[str]]:
    """
    Get the context for the RAG agent to answer the user's query.
    
    Args:
        document_id: The UUID of the document
        user_query: The user's query
    
    Returns:
        Tuple of (results, rows_chunks):
        - results: List of similar document chunks with scores
        - rows_chunks: List of structured row chunks
    """
    openai_api_key = os.getenv("OPENAI_API_KEY")
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small", api_key=openai_api_key)
    content_text, content_structured = get_content(document_id)

    # Initialize variables
    text_chunks = []
    rows_chunks = []

    if content_text:
        text_splitter = CharacterTextSplitter(chunk_size=600, chunk_overlap=100)
        text_chunks = text_splitter.split_text(content_text)

    if content_structured:
        rows_chunks = get_row_chunks(content_structured)
    
    # Only create vector store if we have text chunks
    if text_chunks:
        db = FAISS.from_texts(text_chunks, embeddings)
        results = db.similarity_search_with_score(user_query, k=5)  # k=5 to get top 5 results
    else:
        # If no text chunks, return empty results
        results = []
    
    return results, rows_chunks

