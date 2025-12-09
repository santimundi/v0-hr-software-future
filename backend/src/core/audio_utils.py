"""
Audio utilities for voice mode.

This module provides:
- Groq Whisper STT transcription
- Groq PlayAI TTS synthesis
- Supabase Storage audio upload with signed URLs
"""

import os
import logging
from typing import Any, Dict, Optional

from groq import Groq
from fastapi import HTTPException
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# -----------------------------
# Configuration
# -----------------------------
VOICE_BUCKET = os.getenv("VOICE_BUCKET", "voice")


_groq_client: Optional[Groq] = None


def _get_groq_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq()
    return _groq_client


# -----------------------------
# Groq Whisper STT
# -----------------------------
def groq_whisper_transcribe_bytes(
    audio_bytes: bytes,
    *,
    model: str = "whisper-large-v3-turbo",
    response_format: str = "verbose_json",
    temperature: float = 0.0,
    filename: str = "audio.webm",
) -> Dict[str, Any]:
    """
    Transcribe audio bytes using Groq Whisper.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing GROQ_API_KEY for STT")

    client = _get_groq_client()
    try:
        result = client.audio.transcriptions.create(
            file=(filename, audio_bytes),
            model=model,
            temperature=temperature,
            response_format=response_format,
        )
    except Exception as e:
        logger.error(f"Groq Whisper error: {e}")
        raise HTTPException(status_code=502, detail=f"Groq Whisper STT error: {e}")

    transcript = getattr(result, "text", "") or ""
    language = getattr(result, "language", None)
    # Some responses may include language under dict-style access
    if not language and isinstance(result, dict):
        language = result.get("language")
    return {"transcript": transcript.strip(), "language": language, "raw": result}


# -----------------------------
# Groq PlayAI TTS (Text-to-Speech)
# -----------------------------
def groq_tts_bytes(
    text: str,
    *,
    model: str = "playai-tts",
    voice: str = "Aaliyah-PlayAI",
    response_format: str = "wav",
) -> bytes:
    """
    Convert text to speech using Groq PlayAI TTS.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing GROQ_API_KEY for TTS")

    client = _get_groq_client()
    try:
        resp = client.audio.speech.create(
            model=model,
            voice=voice,
            response_format=response_format,
            input=text,
        )
    except Exception as e:
        logger.error(f"Groq TTS error: {e}")
        raise HTTPException(status_code=502, detail=f"Groq TTS error: {e}")

    # The response object supports streaming; we extract raw bytes
    content = getattr(resp, "content", None)
    if content is None and hasattr(resp, "read"):
        content = resp.read()
    if content is None:
        raise HTTPException(status_code=502, detail="Groq TTS returned no audio content")
    return content


# -----------------------------
# Supabase Storage helpers
# -----------------------------
def get_supabase_admin_client() -> Client:
    """
    Create a Supabase admin client for Storage operations.
    
    Returns:
        Supabase client instance
    
    Raises:
        RuntimeError: If SUPABASE_URL or key is missing
    """
    url = os.getenv("SUPABASE_URL")
    key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_SERVICE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
    )
    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL and/or a Supabase key for Storage operations.")
    return create_client(url, key)


def upload_audio_and_get_signed_url(
    supabase: Client,
    *,
    bucket: str,
    path: str,
    audio_bytes: bytes,
    content_type: str = "audio/mpeg",
    expires_in_seconds: int = 600,
) -> str:
    """
    Upload audio bytes to Supabase Storage and return a signed URL.
    
    Args:
        supabase: Supabase client instance
        bucket: Storage bucket name
        path: Path within the bucket (e.g., "voice/EMP001/uuid.mp3")
        audio_bytes: Audio data to upload
        content_type: MIME type (default: "audio/mpeg")
        expires_in_seconds: Signed URL expiration (default: 600 = 10 minutes)
    
    Returns:
        Signed URL for the uploaded audio file
    """
    # Upload with upsert to allow overwriting during development
    supabase.storage.from_(bucket).upload(
        path,
        audio_bytes,
        {"content-type": content_type, "upsert": "true"},
    )
    
    # Create signed URL
    signed = supabase.storage.from_(bucket).create_signed_url(path, expires_in_seconds)
    
    # Handle different response shapes from supabase-py versions
    if isinstance(signed, dict):
        return (
            signed.get("signedURL")
            or signed.get("signedUrl")
            or signed.get("signed_url")
            or signed.get("url")
            or ""
        )
    return ""


def get_audio_mime_type(encoding: str) -> str:
    """
    Get MIME type for audio encoding.
    
    Args:
        encoding: Audio encoding (e.g., "mp3", "wav")
    
    Returns:
        MIME type string
    """
    if encoding == "mp3":
        return "audio/mpeg"
    if encoding == "wav":
        return "audio/wav"
    return "application/octet-stream"

