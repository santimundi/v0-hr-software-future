import os
import logging
import uvicorn
import time
import json
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv

# Set up logging FIRST, before any other imports that might use logging
from logging_config import setup_logging
setup_logging()

logger = logging.getLogger(__name__)
from langchain_groq import ChatGroq
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage
from langgraph.types import Command
from src.hr_agent.graphbuilder import HR_Agent_GraphBuilder
from src.services.main import DocumentService

# MCP helpers
from src.core.mcp.supabase import *

# Audit logging
from src.core.audit import *
from src.core.audit_helpers import *

# Audio utilities for voice mode
from src.core.audio_utils import (
    groq_whisper_transcribe_bytes,
    groq_tts_bytes,
    get_supabase_admin_client,
    upload_audio_and_get_signed_url,
    get_audio_mime_type,
    VOICE_BUCKET,
)

# Load environment variables (GROQ key, SUPABASE PAT, etc.)
load_dotenv(".env.local")


# We create the LLM once per process; no need to recreate it per request.
# llm = ChatAnthropic(
#     model="claude-sonnet-4-5-20250929",
#     api_key=os.getenv("CLAUDE_API_KEY"),
# )
llm = ChatGroq(
   model="openai/gpt-oss-20b",
   #model="moonshotai/kimi-k2-instruct-0905",
   api_key=os.getenv("GROQ_API_KEY"),
)


def _get_llm_model_name() -> str:
    """Get the LLM model name for audit logging."""
    return getattr(llm, "model", None) or getattr(llm, "model_name", None) or "unknown"


def _set_audit_context(data: Dict[str, Any], request: Request) -> Dict[str, Any]:
    """
    Set request/thread/actor context variables and return config + convenience fields.
    """
    request_id = new_request_id()
    request_id_var.set(request_id)
    
    employee_id = data.get("employee_id", "") or ""
    thread_id_var.set(employee_id)
    config = {"configurable": {"thread_id": employee_id}}
    
    employee_name = data.get("employee_name", "") or ""
    job_title = data.get("job_title", "") or ""
    role = data.get("role", "employee") or "employee"
    
    actor_info = {
        "employee_id": employee_id,
        "display_name": employee_name,
        "job_title": job_title,
        "role": role,
    }
    actor_var.set(actor_info)
    
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    return {
        "request_id": request_id,
        "employee_id": employee_id,
        "employee_name": employee_name,
        "job_title": job_title,
        "role": role,
        "config": config,
        "client_ip": client_ip,
        "user_agent": user_agent,
    }

# -----------------------------
# App lifecycle (lifespan context manager)
# -----------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI app lifecycle.
    
    Startup (before yield):
    - Open ONE persistent MCP session to Supabase MCP (fast tool calls)
    - Load MCP tools bound to that session
    - Build the LangGraph graph ONCE and cache it
    
    This avoids:
    - Rebuilding the graph on every /query request
    - Re-discovering tools repeatedly
    - Opening/closing MCP sessions repeatedly per tool call
    
    Shutdown (after yield):
    - Close the persistent MCP session
    """
    # Startup: Initialize MCP and build graph
    await init_mcp(server_name="supabase")
    all_tools = await get_mcp_tools()
    
    # Filter to only include 'execute_sql' and 'list_tables' tools
    # Sort by name to ensure consistent ordering: 'execute_sql' will be index 0, 'list_tables' will be index 1
    tools = sorted(
        [tool for tool in all_tools if tool.name in ['execute_sql', 'list_tables']],
        key=lambda t: t.name
    )
    logger.info(f"Filtered MCP tools: {[tool.name for tool in tools]}")

    app.state.document_service = DocumentService()

    app.state.hr_graph = HR_Agent_GraphBuilder(llm = llm, tools=tools).build_graph()

    # Initialize Supabase admin client for Storage (voice audio upload)
    try:
        app.state.supabase_admin = get_supabase_admin_client()
        logger.info("Supabase admin client initialized for voice Storage.")
    except Exception as e:
        app.state.supabase_admin = None
        logger.warning(f"Supabase admin client not initialized: {type(e).__name__}: {e}")

    yield  # App runs here
    
    # Shutdown: Cleanup MCP session
    try:
        await shutdown_mcp()
    except Exception as e:
        # Suppress shutdown errors - these are cleanup issues and don't affect functionality
        logger.warning(f"Non-critical error during MCP shutdown: {type(e).__name__}: {e}")

# -----------------------------
# FastAPI app setup
# -----------------------------
app = FastAPI(lifespan=lifespan)

# Allow your Next.js frontend (localhost:3000) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# API endpoint
# -----------------------------
@app.post("/query")
async def answer_query(request: Request):
    """
    Main endpoint called by the frontend.

    Per request:
    - Read query and employee_id
    - Reuse the cached graph (built at startup)
    - Invoke graph asynchronously (required for async MCP tools)
    - This endpoint is also used to provide feedback to the grapg when an interrupt is triggered
    """
    
    start_time = time.time()
    data = await request.json()

    # Populate audit/context vars in one place
    ctx = _set_audit_context(data, request)
    employee_id = ctx["employee_id"]
    employee_name = ctx["employee_name"]
    job_title = ctx["job_title"]
    role = ctx["role"]
    config = ctx["config"]
    client_ip = ctx["client_ip"]
    user_agent = ctx["user_agent"]
    voice_query = data.get("voice_query", False)

    graph = app.state.hr_graph

    # 1) RESUME PATH (user provided feedback)
    query = data.get("query", "")
    selected_scopes = data.get("selected_scopes", ["all"])
    logger.info("Handling request in /query endpoint")
    
    if "resume" in data:
        # Log resume request (without sensitive text)
        audit_hitl_resume_received(data.get("resume", {}))
        
        result = await graph.ainvoke(Command(resume=data["resume"]), config=config)

    # 2) NEW RUN PATH
    else:
        document_name = data.get("document_name", "")
        
        # Log document_name if provided
        if document_name:
            logger.info(f"[query] Received query with document_name: '{document_name}'")
        else:
            logger.info("[query] Received query without document_name")
        
        # Invoke graph first to generate query_topic
        result = await graph.ainvoke(
            {
                "messages": [HumanMessage(content=query)],
                "user_query": query,
                "employee_id": employee_id,
                "employee_name": employee_name,
                "job_title": job_title,
                "document_name": document_name,
            },
            config=config,
        )
        
    # Extract query_topic from graph result
    query_topic = result.get("query_topic", "")
    
    # Log request received with query_topic (after graph execution)
    audit_request_received(query, query_topic=query_topic, selected_scopes=selected_scopes, client_ip=client_ip, user_agent=user_agent)

    # Calculate response time
    response_time_ms = int((time.time() - start_time) * 1000)

    # Check if this is a policy studio result
    if "policy_test_results" in result and result["policy_test_results"]:
        # Log response sent (policy test results)
        audit_response_sent(
            "policy_test_results",
            response_time_ms=response_time_ms,
            model_provider="groq",
            model_name="openai/gpt-oss-120b"
        )
        
        return {
            "type": "policy_test_results",
            "data": result["policy_test_results"]
        }

    # Check if this is an onboarding result with signed URLs
    if "signed_urls" in result and result["signed_urls"]:
        # Log response sent (onboarding documents)
        audit_response_sent(
            "onboarding_documents",
            response_time_ms=response_time_ms,
            model_provider="groq",
            model_name="openai/gpt-oss-120b"
        )
        
        return {
            "type": "onboarding_documents",
            "signed_urls": result["signed_urls"]
        }

    # If graph is paused for HITL, return that to frontend
    if "__interrupt__" in result and result["__interrupt__"]:
        # result["__interrupt__"] is often a list of Interrupt objects; payload is in .value
        interrupts = []
        interrupt_types = []
        for it in result["__interrupt__"]:
            interrupt_value = getattr(it, "value", it)
            interrupts.append(interrupt_value)
            if isinstance(interrupt_value, dict):
                interrupt_types.append(interrupt_value.get("type", "unknown"))
        
        # Set interrupt_id if available
        if interrupts and isinstance(interrupts[0], dict):
            interrupt_id = interrupts[0].get("id") or new_request_id()
            interrupt_id_var.set(interrupt_id)
        
        # Log response sent (interrupt)
        audit_response_sent(
            "interrupt",
            response_time_ms=response_time_ms,
            model_provider="groq",  # TODO: Get from actual LLM config
            model_name="openai/gpt-oss-120b"
        )
        
        return {
            "type": "interrupt",
            "interrupts": interrupts,
        }

    # Otherwise normal completion
    msg = result["messages"][-1].content if result.get("messages") else ""
    msg_preview = str(msg)[:200] if msg else None  # Preview first 200 chars
    
    # Log response sent (final)
    audit_response_sent(
        "final",
        message_preview=msg_preview,
        actions_emitted=[],
        response_time_ms=response_time_ms,
        model_provider="groq",  # TODO: Get from actual LLM config
        model_name="openai/gpt-oss-120b"
    )
    
    return {"type": "final", "data": msg}



@app.post("/upload_file")
async def upload_file(request: Request):
    """
    Upload a file to the database storage and update the database with the file information.
    """
    # Extract JSON payload
    data = await request.json()
    employee_id = data.get("employee_id", "")
    employee_name = data.get("employee_name", "")
    filename = data.get("filename", "")
    file_bytes_array = data.get("file_bytes", [])

    # Convert array of bytes (0-255) back to actual bytes object
    if isinstance(file_bytes_array, list):
        file_bytes = bytes(file_bytes_array)
    else:
        file_bytes = file_bytes_array if isinstance(file_bytes_array, bytes) else b""
    
    # Get document service instance
    document_service = app.state.document_service
    
    # Process document upload
    result = await document_service.process_document_upload(
        employee_id=employee_id,
        employee_name=employee_name,
        filename=filename,
        file_bytes=file_bytes
    )
    
    # Return response in the expected format
    return {
        "response": {
            "status_code": result.get("status_code", 500),
            "message": result.get("message", "Unknown error")
        }
    }


# -----------------------------
# Voice endpoint
# -----------------------------
@app.post("/voice")
async def voice(
    request: Request,
    employee_id: str = Form(...),
    employee_name: str = Form(""),
    job_title: str = Form(""),
    role: str = Form("employee"),
    audio: UploadFile = File(None),
    stt_model: str = Form("whisper-large-v3-turbo"),
    tts_model: str = Form("playai-tts"),
    tts_voice: str = Form("Aaliyah-PlayAI"),
    tts_encoding: str = Form("wav"),
    resume: str = Form(None),
):
    """
    Voice mode endpoint:
    1. Receives audio (multipart/form-data)
    2. Transcribes via Groq Whisper STT
    3. Runs HR graph with transcript
    4. Synthesizes response via Deepgram TTS
    5. Uploads audio to Supabase Storage
    6. Returns signed URL for frontend to play
    """
    logger.info("Handling request in /voice endpoint")
    start_time = time.time()

    # Set audit context
    data = {
        "employee_id": employee_id,
        "employee_name": employee_name,
        "job_title": job_title,
        "role": role,
    }
    ctx = _set_audit_context(data, request)
    graph = app.state.hr_graph

    # Handle resume (HITL) via voice endpoint
    if resume:
        try:
            resume_data = json.loads(resume)
        except Exception:
            resume_data = resume

        result = await graph.ainvoke(Command(resume=resume_data), config=ctx["config"])
        transcript = ""
        detected_lang = None
    else:
        # 1. Read audio bytes
        if audio is None:
            raise HTTPException(status_code=400, detail="Empty audio upload")

        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio upload")

        # 2. STT - transcribe audio (Groq Whisper only)
        stt = groq_whisper_transcribe_bytes(
            audio_bytes=audio_bytes,
            model=stt_model or "whisper-large-v3-turbo",
        )
        transcript = stt.get("transcript", "")
        detected_lang = stt.get("language")

        if not transcript:
            raise HTTPException(status_code=400, detail="Could not transcribe audio")

        logger.info(f"Voice transcript: {transcript[:100]}...")
        if detected_lang:
            logger.info(f"Voice detected language: {detected_lang}")

        # Audit: treat transcript as the "query"
        audit_request_received(
            transcript,
            query_topic="",
            selected_scopes=["all"],
            client_ip=ctx["client_ip"],
            user_agent=ctx["user_agent"],
        )

        # 3. Run HR graph with transcript as query
        result = await graph.ainvoke(
            {
                "messages": [HumanMessage(content=transcript)],
                "user_query": transcript,
                "employee_id": employee_id,
                "employee_name": employee_name,
                "job_title": job_title,
                "document_name": "",
                "voice_query": True,
            },
            config=ctx["config"],
        )

    response_time_ms = int((time.time() - start_time) * 1000)
    model_name = _get_llm_model_name()

    # 4. Handle interrupts (HITL) - return without TTS
    if result.get("__interrupt__"):
        interrupts = [getattr(it, "value", it) for it in result["__interrupt__"]]
        if interrupts and isinstance(interrupts[0], dict):
            interrupt_id_var.set(interrupts[0].get("id") or new_request_id())

        audit_response_sent(
            "interrupt",
            response_time_ms=response_time_ms,
            model_provider="groq",
            model_name=model_name,
        )
        
        return {
            "type": "interrupt",
            "transcript": transcript,
            "detected_language": detected_lang,
            "interrupts": interrupts,
        }

    # 5. Get AI response text (for chat) and voice-formatted text (for TTS)
    chat_text = result["messages"][-1].content if result.get("messages") else ""
    if not chat_text:
        chat_text = "Sorry, I couldn't generate a response."

    voice_text = result.get("result_for_voice") or chat_text

    # 6. TTS - convert voice_text to audio (Groq PlayAI)
    selected_model = tts_model
    selected_voice = tts_voice

    if detected_lang and str(detected_lang).lower().startswith("ar"):
        selected_model = "playai-tts-arabic"
        selected_voice = "Nasser-PlayAI"

    tts_bytes = groq_tts_bytes(
        voice_text,
        model=selected_model,
        voice=selected_voice,
        response_format=tts_encoding,
    )

    # 7. Upload to Supabase Storage and get signed URL
    if not app.state.supabase_admin:
        raise HTTPException(status_code=500, detail="Supabase not configured for audio upload")

    path = f"voice/{employee_id}.{tts_encoding}"
    audio_url = upload_audio_and_get_signed_url(
        app.state.supabase_admin,
        bucket=VOICE_BUCKET,
        path=path,
        audio_bytes=tts_bytes,
        content_type=get_audio_mime_type(tts_encoding),
    )

    audit_response_sent(
        "final",
        message_preview=str(chat_text)[:200],
        response_time_ms=response_time_ms,
        model_provider="groq",
        model_name=model_name,
    )

    return {
        "type": "voice_final",
        "transcript": transcript,
        "detected_language": detected_lang,
        "text": chat_text,
        "voice_text": voice_text,
        "audio_url": audio_url,
        "audio_mime": get_audio_mime_type(tts_encoding),
    }


# -----------------------------
# Local dev entrypoint
# -----------------------------
if __name__ == "__main__":

    # Run FastAPI server
    # Uvicorn startup/shutdown messages will show in console
    # Application logs go to files only
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000, 
        reload=False
    )
