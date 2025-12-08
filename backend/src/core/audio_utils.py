"""
Audio utilities for voice mode.

This module provides:
- Deepgram STT (Speech-to-Text) transcription
- Deepgram TTS (Text-to-Speech) synthesis
- Supabase Storage audio upload with signed URLs
"""

import os
import logging
from typing import Any, Dict, Optional

import httpx
from fastapi import HTTPException
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# -----------------------------
# Configuration
# -----------------------------
DEEPGRAM_BASE_URL = "https://api.deepgram.com"
VOICE_BUCKET = os.getenv("VOICE_BUCKET", "voice")


_http_client: Optional[httpx.AsyncClient] = None


async def _get_http_client() -> httpx.AsyncClient:
    """
    Return a shared AsyncClient to avoid creating a new connection per request.
    """
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(timeout=60.0)
    return _http_client


# -----------------------------
# Deepgram STT (Speech-to-Text)
# -----------------------------
async def deepgram_transcribe_bytes(
    audio_bytes: bytes,
    content_type: str,
    *,
    model: str = "nova-3",
    detect_language: bool = False,
) -> Dict[str, Any]:
    """
    Transcribe audio bytes using Deepgram STT API.
    
    Args:
        audio_bytes: Raw audio data
        content_type: MIME type of the audio (e.g., "audio/webm", "audio/mp3")
        model: Deepgram model to use (default: "nova-2")
        detect_language: Whether to detect the language (default: True)
    
    Returns:
        Dict with:
            - transcript: The transcribed text
            - language: Detected language code (if detect_language=True)
            - raw: Full Deepgram response
    
    Raises:
        HTTPException: If API key is missing or Deepgram returns an error
    """
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing DEEPGRAM_API_KEY")

    params = {
        "model": model,
        "punctuate": "true",
        "smart_format": "true",
        "detect_language": "true" if detect_language else "false",
    }

    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": content_type or "application/octet-stream",
    }

    client = await _get_http_client()
    r = await client.post(
        f"{DEEPGRAM_BASE_URL}/v1/listen",
        params=params,
        headers=headers,
        content=audio_bytes,
    )
    if r.status_code >= 400:
        logger.error(f"Deepgram STT error: {r.text}")
        raise HTTPException(status_code=502, detail=f"Deepgram STT error: {r.text}")
    raw = r.json()

    # Parse transcript from response
    transcript = ""
    try:
        transcript = (
            raw.get("results", {})
            .get("channels", [{}])[0]
            .get("alternatives", [{}])[0]
            .get("transcript", "")
        ) or ""
    except Exception:
        transcript = ""

    # Parse detected language
    language = None
    try:
        language = (
            raw.get("results", {})
            .get("channels", [{}])[0]
            .get("detected_language")
        )
    except Exception:
        language = None

    return {"transcript": transcript.strip(), "language": language, "raw": raw}


# -----------------------------
# Deepgram TTS (Text-to-Speech)
# -----------------------------
async def deepgram_tts_bytes(
    text: str,
    *,
    model: str = "aura-2-thalia-en",
    encoding: str = "mp3",
) -> bytes:
    """
    Convert text to speech using Deepgram TTS API.
    
    Args:
        text: Text to synthesize
        model: Deepgram TTS model (default: "aura-2-thalia-en")
        encoding: Audio encoding format (default: "mp3")
    
    Returns:
        Audio bytes in the specified encoding
    
    Raises:
        HTTPException: If API key is missing or Deepgram returns an error
    """
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing DEEPGRAM_API_KEY")

    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": "application/json",
        "Accept": "audio/mpeg" if encoding == "mp3" else "audio/wav",
    }

    client = await _get_http_client()
    r = await client.post(
        f"{DEEPGRAM_BASE_URL}/v1/speak",
        params={"model": model, "encoding": encoding},
        headers=headers,
        json={"text": text},
    )
    if r.status_code >= 400:
        logger.error(f"Deepgram TTS error: {r.text}")
        raise HTTPException(status_code=502, detail=f"Deepgram TTS error: {r.text}")
    return r.content


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
    return "audio/mpeg" if encoding == "mp3" else "audio/wav"

