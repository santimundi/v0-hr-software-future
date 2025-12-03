"""
Audit logging module for HR Agent.

This module provides audit logging functionality that writes JSONL events
to a dedicated audit log file, separate from application logs.

Each audit event includes:
- Timestamp (ISO-8601)
- Event type
- Level (info/warning/error)
- Environment
- Correlation IDs (request_id, thread_id, interrupt_id)
- Actor information (employee_id, employee_name, job_title)
- Component (app/graph/node/tool)
- Event-specific data
"""

import json
import logging
import os
import re
import hashlib
import uuid
from contextvars import ContextVar
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set
from logging.handlers import TimedRotatingFileHandler

# Context variables for correlation IDs and actor information
request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
thread_id_var: ContextVar[Optional[str]] = ContextVar("thread_id", default=None)
actor_var: ContextVar[Optional[Dict[str, str]]] = ContextVar("actor", default=None)
interrupt_id_var: ContextVar[Optional[str]] = ContextVar("interrupt_id", default=None)

# Environment variable to control whether to store full query text or hash
# Default: store hash + length (safe)
STORE_FULL_QUERY = os.getenv("AUDIT_STORE_FULL_QUERY", "false").lower() == "true"
ENVIRONMENT = os.getenv("ENVIRONMENT", "dev")


class JSONLFormatter(logging.Formatter):
    """Custom formatter that outputs JSONL (one JSON object per line)."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSONL."""
        # Extract event data from record
        event_data = getattr(record, "event_data", {})
        
        # Build the audit event envelope
        event = {
            "ts": datetime.utcnow().isoformat() + "Z",
            "event": getattr(record, "event_type", "unknown"),
            "level": record.levelname.lower(),
            "env": ENVIRONMENT,
            "request_id": getattr(record, "request_id", None) or request_id_var.get(),
            "thread_id": getattr(record, "thread_id", None) or thread_id_var.get(),
            "interrupt_id": getattr(record, "interrupt_id", None) or interrupt_id_var.get(),
            "actor": getattr(record, "actor", None) or actor_var.get() or {},
            "component": getattr(record, "component", "app"),
            "data": event_data,
        }
        
        # Remove None values to keep JSON clean
        event = {k: v for k, v in event.items() if v is not None}
        
        return json.dumps(event, ensure_ascii=False)


class FlushingTimedRotatingFileHandler(TimedRotatingFileHandler):
    """A TimedRotatingFileHandler that flushes after each log entry."""
    
    def emit(self, record):
        super().emit(record)
        self.flush()


def setup_audit_logger(log_dir: str = "logs") -> logging.Logger:
    """
    Set up the audit logger with JSONL output.
    
    Args:
        log_dir: Base directory for logs (default: "logs")
    
    Returns:
        Configured audit logger
    """
    # Create base logs directory if it doesn't exist
    base_log_path = Path(log_dir)
    base_log_path.mkdir(exist_ok=True)
    
    # Create audit subdirectory
    audit_log_path = base_log_path / "audit"
    audit_log_path.mkdir(exist_ok=True)
    
    # Create today's date folder (YYYY-MM-DD format)
    today = datetime.now().strftime("%Y-%m-%d")
    daily_log_path = audit_log_path / today
    daily_log_path.mkdir(exist_ok=True)
    
    # Set up log file path
    audit_log_file = daily_log_path / "audit.jsonl"
    
    # Get or create audit logger
    audit_logger = logging.getLogger("audit")
    audit_logger.setLevel(logging.DEBUG)
    
    # Remove existing handlers to avoid duplicates
    audit_logger.handlers.clear()
    audit_logger.propagate = False  # Don't propagate to root logger
    
    # Create handler with daily rotation
    handler = FlushingTimedRotatingFileHandler(
        audit_log_file,
        when="midnight",
        interval=1,
        backupCount=30,  # Keep 30 days of logs
        encoding="utf-8"
    )
    
    # Set formatter
    handler.setFormatter(JSONLFormatter())
    audit_logger.addHandler(handler)
    
    return audit_logger


# Initialize audit logger
_audit_logger = setup_audit_logger()


def log_execution_separator() -> None:
    """
    Log a separator event to indicate a new execution run in the audit log.

    This uses the normal audit envelope so it appears as:
    {
      "ts": "...",
      "event": "execution_separator",
      "level": "info",
      "env": "...",
      "component": "system",
      "data": {
        "separator": "====...",
        "message": "NEW EXECUTION RUN - ..."
      }
    }
    """
    extra = {
        "event_type": "execution_separator",
        "event_data": {
            "separator": "=" * 80,
            "message": f"NEW EXECUTION RUN - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        },
        "component": "system",
    }
    _audit_logger.info("Execution separator", extra=extra)


# Note: Execution separator is logged by logging_config.py after setup_logging()


# Helper functions

def new_request_id() -> str:
    """Generate a new request ID (UUID)."""
    return str(uuid.uuid4())


def hash_text(text: str) -> str:
    """
    Compute SHA256 hash of text.
    
    Args:
        text: Text to hash
    
    Returns:
        Hexadecimal hash string
    """
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def extract_tables_from_sql(sql: str) -> List[str]:
    """
    Extract table names from SQL query (best-effort).
    
    Supports:
    - SELECT ... FROM table_name
    - INSERT INTO table_name
    - UPDATE table_name
    - DELETE FROM table_name
    - JOIN table_name
    - WITH ... AS (SELECT ... FROM table_name)
    
    Args:
        sql: SQL query string
    
    Returns:
        List of table names found (may be empty or incomplete)
    """
    if not sql:
        return []
    
    # Normalize SQL: remove comments, normalize whitespace
    sql_normalized = re.sub(r"--.*?$", "", sql, flags=re.MULTILINE)
    sql_normalized = re.sub(r"/\*.*?\*/", "", sql_normalized, flags=re.DOTALL)
    sql_normalized = " ".join(sql_normalized.split())
    
    tables: Set[str] = set()
    
    # Pattern 1: FROM table_name (with optional schema.table_name)
    from_pattern = r'\bFROM\s+(?:(\w+)\.)?(\w+)'
    for match in re.finditer(from_pattern, sql_normalized, re.IGNORECASE):
        schema, table = match.groups()
        if table:
            tables.add(table.lower())
    
    # Pattern 2: INSERT INTO table_name
    insert_pattern = r'\bINSERT\s+INTO\s+(?:(\w+)\.)?(\w+)'
    for match in re.finditer(insert_pattern, sql_normalized, re.IGNORECASE):
        schema, table = match.groups()
        if table:
            tables.add(table.lower())
    
    # Pattern 3: UPDATE table_name
    update_pattern = r'\bUPDATE\s+(?:(\w+)\.)?(\w+)'
    for match in re.finditer(update_pattern, sql_normalized, re.IGNORECASE):
        schema, table = match.groups()
        if table:
            tables.add(table.lower())
    
    # Pattern 4: DELETE FROM table_name
    delete_pattern = r'\bDELETE\s+FROM\s+(?:(\w+)\.)?(\w+)'
    for match in re.finditer(delete_pattern, sql_normalized, re.IGNORECASE):
        schema, table = match.groups()
        if table:
            tables.add(table.lower())
    
    # Pattern 5: JOIN table_name
    join_pattern = r'\b(?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+(?:(\w+)\.)?(\w+)'
    for match in re.finditer(join_pattern, sql_normalized, re.IGNORECASE):
        schema, table = match.groups()
        if table:
            tables.add(table.lower())
    
    return sorted(list(tables))


def classify_sql(sql: str) -> str:
    """
    Classify SQL query as "read" or "write".
    
    Args:
        sql: SQL query string
    
    Returns:
        "read" or "write"
    """
    from src.hr_agent.utils import is_write_sql
    return "write" if is_write_sql(sql) else "read"


def audit_event(
    event_type: str,
    level: str = "info",
    component: str = "app",
    data: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None,
    thread_id: Optional[str] = None,
    interrupt_id: Optional[str] = None,
    actor: Optional[Dict[str, str]] = None,
    **kwargs
) -> None:
    """
    Log an audit event.
    
    Args:
        event_type: Type of event (e.g., "request_received", "db_write_proposed")
        level: Log level ("info", "warning", "error")
        component: Component that generated the event ("app", "graph", "node", "tool")
        data: Event-specific data dictionary
        request_id: Request ID (defaults to context variable)
        thread_id: Thread ID (defaults to context variable)
        interrupt_id: Interrupt ID (defaults to context variable)
        actor: Actor information dict (defaults to context variable)
        **kwargs: Additional fields to include in data
    """
    # Merge kwargs into data
    event_data = data or {}
    if kwargs:
        event_data = {**event_data, **kwargs}
    
    # Get context values if not explicitly provided
    req_id = request_id or request_id_var.get()
    thr_id = thread_id or thread_id_var.get()
    int_id = interrupt_id or interrupt_id_var.get()
    act = actor or actor_var.get()
    
    # Create log record with extra fields
    extra = {
        "event_type": event_type,
        "event_data": event_data,
        "component": component,
        "request_id": req_id,
        "thread_id": thr_id,
        "interrupt_id": int_id,
        "actor": act,
    }
    
    # Log at appropriate level
    log_level = getattr(logging, level.upper(), logging.INFO)
    _audit_logger.log(log_level, f"Audit event: {event_type}", extra=extra)

