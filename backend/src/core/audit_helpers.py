"""
Audit logging helper functions.

This module provides high-level helper functions for common audit logging scenarios,
making the code more readable and maintainable.
"""

import re
import logging
from typing import Any, Dict, Optional
from src.core.audit import (
    audit_event, hash_text, extract_tables_from_sql, classify_sql,
    STORE_FULL_QUERY
)

logger = logging.getLogger(__name__)


def _prepare_sql_data(sql_query: str) -> Dict[str, Any]:
    """
    Prepare SQL data for audit logging (hash or full text based on config).
    
    Args:
        sql_query: The SQL query string
    
    Returns:
        Dictionary with sql/sql_hash
    """
    if STORE_FULL_QUERY:
        return {"sql": sql_query}
    else:
        return {"sql_hash": f"sha256:{hash_text(sql_query)}"}


def _extract_sql_operation(sql_query: str) -> str:
    """
    Extract SQL operation type (insert, update, delete, etc.).
    
    Args:
        sql_query: The SQL query string
    
    Returns:
        Operation type string (e.g., "insert", "update", "delete")
    """
    sql_normalized = sql_query.strip().lower()
    
    if sql_normalized.startswith("insert"):
        return "insert"
    elif sql_normalized.startswith("update"):
        return "update"
    elif sql_normalized.startswith("delete"):
        return "delete"
    elif sql_normalized.startswith("upsert"):
        return "upsert"
    elif sql_normalized.startswith("create"):
        return "create"
    elif sql_normalized.startswith("alter"):
        return "alter"
    elif sql_normalized.startswith("drop"):
        return "drop"
    elif sql_normalized.startswith("truncate"):
        return "truncate"
    else:
        return "unknown"


def audit_policy_studio_started(
    num_scenarios: int,
    query_preview: Optional[str] = None
) -> None:
    """
    Audit log when policy studio evaluation starts.
    
    Args:
        num_scenarios: Number of test scenarios being evaluated
        query_preview: Optional preview of the query (first 200 chars)
    """
    data = {
        "policy_studio": {
            "num_scenarios": num_scenarios,
        }
    }
    
    if query_preview:
        data["policy_studio"]["query_preview"] = query_preview[:200]
    
    audit_event(
        "policy_studio_started",
        component="node",
        data=data
    )


def audit_policy_studio_completed(
    num_scenarios: int,
    results_summary: Optional[Dict[str, int]] = None,
    latency_ms: Optional[int] = None
) -> None:
    """
    Audit log when policy studio evaluation completes successfully.
    
    Args:
        num_scenarios: Number of test scenarios evaluated
        results_summary: Optional summary dict with counts (e.g., {"clear": 2, "ambiguous": 1, "conflict": 1})
        latency_ms: Optional execution latency in milliseconds
    """
    data = {
        "policy_studio": {
            "num_scenarios": num_scenarios,
            "status": "completed",
        }
    }
    
    if results_summary:
        data["policy_studio"]["results_summary"] = results_summary
    
    if latency_ms is not None:
        data["policy_studio"]["latency_ms"] = latency_ms
    
    audit_event(
        "policy_studio_completed",
        component="node",
        data=data
    )


def audit_policy_studio_error(
    num_scenarios: int,
    error: Exception,
    query_preview: Optional[str] = None
) -> None:
    """
    Audit log when policy studio evaluation fails with an error.
    
    Args:
        num_scenarios: Number of test scenarios that were attempted
        error: The exception that occurred
        query_preview: Optional preview of the query (first 200 chars)
    """
    data = {
        "policy_studio": {
            "num_scenarios": num_scenarios,
            "status": "error",
            "error_type": type(error).__name__,
            "error_message": str(error),
        }
    }
    
    if query_preview:
        data["policy_studio"]["query_preview"] = query_preview[:200]
    
    audit_event(
        "policy_studio_error",
        level="error",
        component="node",
        data=data
    )


def extract_rows_affected(result: Any) -> Optional[int]:
    """
    Extract row count from tool result (best-effort).
    
    Args:
        result: Tool execution result
    
    Returns:
        Row count if extractable, None otherwise
    """
    if isinstance(result, dict):
        return result.get("rows_affected") or result.get("row_count")
    elif isinstance(result, (list, tuple)):
        return len(result)
    elif hasattr(result, "__len__"):
        try:
            return len(result)
        except (TypeError, AttributeError):
            pass
    
    # Try to extract from string representation
    result_str = str(result)
    if "rows" in result_str.lower() or "affected" in result_str.lower():
        match = re.search(r'(\d+)\s*(?:row|record)', result_str, re.IGNORECASE)
        if match:
            return int(match.group(1))
    
    return None


def audit_request_received(
    query: str,
    query_topic: Optional[str] = None,
    selected_scopes: Optional[list] = None,
    client_ip: Optional[str] = None,
    user_agent: Optional[str] = None
) -> None:
    """
    Audit log when a new request is received.
    
    Args:
        query: The user's query text
        query_topic: Optional short topic summary (if already generated by graph node)
        selected_scopes: Optional list of selected scopes
        client_ip: Optional client IP address
        user_agent: Optional user agent string
    """
    input_data = {}
    # Always store the original query (first question) for audit log display
    input_data["query"] = query
    if not STORE_FULL_QUERY:
        # Also store hash for privacy/security purposes if needed
        input_data["query_hash"] = hash_text(query)
    
    # Store query topic summary (from graph node if available, otherwise use fallback)
    if query_topic:
        input_data["query_topic"] = query_topic
    else:
        # Fallback: use first 50 chars if topic not provided
        if len(query) > 50:
            input_data["query_topic"] = query[:47] + "..."
        else:
            input_data["query_topic"] = query
    
    if selected_scopes:
        input_data["selected_scopes"] = selected_scopes
    
    data = {"input": input_data}
    
    if client_ip or user_agent:
        client_data = {}
        if client_ip:
            client_data["ip"] = client_ip
        if user_agent:
            client_data["user_agent"] = user_agent
        data["client"] = client_data
    
    audit_event(
        "request_received",
        component="app",
        data=data
    )


def audit_db_write_proposed(
    sql_query: str,
    tool_call_id: Optional[str],
    hitl_explanation: str
) -> None:
    """
    Audit log when a database write operation is proposed (HITL approval required).
    
    Args:
        sql_query: The SQL query to be executed
        tool_call_id: The tool call ID
        hitl_explanation: The explanation shown to the user
    """
    tables = extract_tables_from_sql(sql_query)
    operation = _extract_sql_operation(sql_query)
    
    data = {
        "hitl": {
            "tool_call_id": tool_call_id,
            "tool": "execute_sql",
            "tables": tables,
            "operation": operation,
            "explanation_shown_to_user": hitl_explanation,
        },
        "proposed_write": _prepare_sql_data(sql_query),
    }
    
    audit_event(
        "db_write_proposed",
        component="node",
        data=data
    )


def audit_db_write_decision(
    tool_call_id: Optional[str],
    approved: bool,
    user_feedback: str
) -> None:
    """
    Audit log when user makes a decision on a write operation.
    
    Args:
        tool_call_id: The tool call ID
        approved: Whether the user approved the operation
        user_feedback: The user's feedback text
    """
    data = {
        "hitl": {
            "tool_call_id": tool_call_id,
            "decision": "approve" if approved else "reject",
            "user_feedback": user_feedback,
        }
    }
    
    audit_event(
        "db_write_decision",
        component="node",
        data=data
    )


def audit_db_write_executed_success(
    tool_call_id: Optional[str],
    sql_query: str,
    result: Any
) -> None:
    """
    Audit log when a database write operation executes successfully.
    
    Args:
        tool_call_id: The tool call ID
        sql_query: The SQL query that was executed
        result: The tool execution result
    """
    tables = extract_tables_from_sql(sql_query)
    operation = _extract_sql_operation(sql_query)
    
    data = {
        "db": {
            "tool_call_id": tool_call_id,
            "tables": tables,
            "operation": operation,
            "executed": True,
        },
        "result": {
            "status": "success",
        }
    }
    
    rows_affected = extract_rows_affected(result)
    if rows_affected is not None:
        data["result"]["rows_affected"] = rows_affected
    
    audit_event(
        "db_write_executed",
        component="node",
        data=data
    )


def audit_db_write_executed_error(
    tool_call_id: Optional[str],
    sql_query: str,
    error: Exception
) -> None:
    """
    Audit log when a database write operation fails with an error.
    
    Args:
        tool_call_id: The tool call ID
        sql_query: The SQL query that failed
        error: The exception that occurred
    """
    tables = extract_tables_from_sql(sql_query)
    operation = _extract_sql_operation(sql_query)
    
    data = {
        "db": {
            "tool_call_id": tool_call_id,
            "tables": tables,
            "operation": operation,
            "executed": False,
        },
        "result": {
            "status": "error",
            "error_type": type(error).__name__,
            "error_message": str(error),
        }
    }
    
    audit_event(
        "db_write_executed",
        level="error",
        component="node",
        data=data
    )


def audit_db_write_executed_blocked(
    tool_call_id: Optional[str],
    sql_query: str,
    reason: str = "rejected_by_user"
) -> None:
    """
    Audit log when a database write operation is blocked/rejected.
    
    Args:
        tool_call_id: The tool call ID
        sql_query: The SQL query that was blocked
        reason: Reason for blocking (default: "rejected_by_user")
    """
    tables = extract_tables_from_sql(sql_query)
    operation = _extract_sql_operation(sql_query)
    
    data = {
        "db": {
            "tool_call_id": tool_call_id,
            "tables": tables,
            "operation": operation,
            "executed": False,
        },
        "result": {
            "status": "skipped",
            "reason": reason,
        }
    }
    
    audit_event(
        "db_write_executed",
        component="node",
        data=data
    )


def audit_sql_operation(
    sql_query: str,
    latency_ms: Optional[int] = None,
    result: Optional[Any] = None
) -> None:
    """
    Audit log a SQL read operation from tool execution.
    
    Args:
        sql_query: The SQL query that was executed
        latency_ms: Execution latency in milliseconds
        result: Optional tool execution result
    """
    tables = extract_tables_from_sql(sql_query)
    sql_data = _prepare_sql_data(sql_query)
    
    result_block: Dict[str, Any] = {"status": "success"}
    if latency_ms is not None:
        result_block["latency_ms"] = latency_ms
    
    data = {
        "db": {
            "tool": "execute_sql",
            "tables": tables,
            **sql_data,
        },
        "result": result_block,
    }
    
    if result is not None:
        row_count = extract_rows_affected(result)
        if row_count is not None:
            data["db"]["row_count"] = row_count
    
    audit_event(
        "db_read",
        component="tool",
        data=data
    )


def audit_tool_error(
    tool_name: str,
    error: Exception,
    latency_ms: int,
    sql_query: Optional[str] = None
) -> None:
    """
    Audit log when a tool execution fails.
    
    Args:
        tool_name: Name of the tool that failed
        error: The exception that occurred
        latency_ms: Execution latency in milliseconds
        sql_query: Optional SQL query if this was a SQL tool
    """
    error_data = {
        "tool_name": tool_name,
        "error_type": type(error).__name__,
        "error_message": str(error),
        "latency_ms": latency_ms,
    }
    
    if sql_query:
        if not STORE_FULL_QUERY:
            error_data["sql_hash"] = f"sha256:{hash_text(sql_query)}"
    
    audit_event(
        "tool_error",
        level="error",
        component="tool",
        data=error_data
    )


def audit_document_accessed(
    document_id: str,
    document_title: Optional[str] = None,
    owner_employee_id: Optional[str] = None,
    tool_name: str = "get_document_context",
    reason: Optional[str] = None,
    scope: Optional[str] = None
) -> None:
    """
    Audit log when a document is accessed.
    
    Args:
        document_id: The UUID of the document accessed
        document_title: Optional document title
        owner_employee_id: Optional owner employee ID
        tool_name: Name of the tool that accessed the document
        reason: Optional reason for access
        scope: Optional scope (e.g., "policies")
    """
    resource = {
        "type": "document",
        "document_id": document_id,
    }
    
    if document_title:
        resource["title"] = document_title
    if owner_employee_id:
        resource["owner_employee_id"] = owner_employee_id
    
    access = {
        "tool": tool_name,
    }
    
    if reason:
        access["reason"] = reason
    if scope:
        access["scope"] = scope
    
    data = {
        "resource": resource,
        "access": access,
        "result": {"status": "success"},
    }
    
    audit_event(
        "document_accessed",
        component="tool",
        data=data
    )


def audit_documents_listed(
    employee_id: str,
    document_ids: list,
    document_titles: list,
    tool_name: str = "list_employee_documents"
) -> None:
    """
    Audit log when documents are listed for an employee.
    
    Args:
        employee_id: The employee ID
        document_ids: List of document IDs
        document_titles: List of document titles
        tool_name: Name of the tool that listed the documents
    """
    audit_event(
        "documents_listed",
        component="tool",
        data={
            "employee_id": employee_id,
            "tool_name": tool_name,
            "document_count": len(document_ids),
            "document_ids": document_ids,
            "document_titles": document_titles,
        }
    )


def audit_policy_accessed(
    policy_id: str,
    policy_title: Optional[str] = None,
    tool_name: str = "get_company_policy_context",
    reason: Optional[str] = None,
    scope: Optional[str] = None
) -> None:
    """
    Audit log when a company policy is accessed.
    
    Args:
        policy_id: The UUID of the policy accessed
        policy_title: Optional policy title
        tool_name: Name of the tool that accessed the policy
        reason: Optional reason for access
        scope: Optional scope (e.g., "policies")
    """
    resource = {
        "type": "policy",
        "policy_id": policy_id,
    }
    
    if policy_title:
        resource["title"] = policy_title
    
    access = {
        "tool": tool_name,
    }
    
    if reason:
        access["reason"] = reason
    if scope:
        access["scope"] = scope
    
    data = {
        "resource": resource,
        "access": access,
        "result": {"status": "success"},
    }
    
    audit_event(
        "policy_accessed",
        component="tool",
        data=data
    )


def audit_policies_listed(
    policy_ids: list,
    policy_titles: list,
    tool_name: str = "list_company_policies"
) -> None:
    """
    Audit log when company policies are listed.
    
    Args:
        policy_ids: List of policy IDs
        policy_titles: List of policy titles
        tool_name: Name of the tool that listed the policies
    """
    audit_event(
        "policies_listed",
        component="tool",
        data={
            "tool_name": tool_name,
            "policy_count": len(policy_ids),
            "policy_ids": policy_ids,
            "policy_titles": policy_titles,
        }
    )


def audit_tool_error_simple(tool_name: str, error: Exception) -> None:
    """
    Audit log when a tool execution fails (simple version without latency/SQL).
    
    Args:
        tool_name: Name of the tool that failed
        error: The exception that occurred
    """
    audit_event(
        "tool_error",
        level="error",
        component="tool",
        data={
            "tool_name": tool_name,
            "error_type": type(error).__name__,
            "error_message": str(error),
        }
    )


def audit_hitl_resume_received(resume_data: Any) -> None:
    """
    Audit log when a HITL resume request is received.
    
    Args:
        resume_data: The resume data (dict or other type)
    """
    if isinstance(resume_data, dict):
        audit_event(
            "hitl_resume_received",
            component="app",
            data={
                "resume_type": "object",
                "has_approved": "approved" in resume_data,
                "has_user_feedback": "user_feedback" in resume_data,
                "user_feedback_length": len(str(resume_data.get("user_feedback", ""))),
            }
        )
    else:
        audit_event(
            "hitl_resume_received",
            component="app",
            data={"resume_type": type(resume_data).__name__}
        )


def audit_response_sent(
    response_type: str,
    message_preview: Optional[str] = None,
    actions_emitted: Optional[list] = None,
    response_time_ms: Optional[int] = None,
    model_provider: Optional[str] = None,
    model_name: Optional[str] = None
) -> None:
    """
    Audit log when a response is sent to the client.
    
    Args:
        response_type: Type of response ("final" or "interrupt")
        message_preview: Optional preview of the response message
        actions_emitted: Optional list of actions emitted
        response_time_ms: Response time in milliseconds
        model_provider: Optional model provider (e.g., "groq")
        model_name: Optional model name (e.g., "openai/gpt-oss-120b")
    """
    data: Dict[str, Any] = {"response_type": response_type}
    
    if message_preview is not None or actions_emitted is not None:
        output = {}
        if message_preview is not None:
            output["message_preview"] = message_preview
        if actions_emitted is not None:
            output["actions_emitted"] = actions_emitted
        data["output"] = output
    
    if model_provider or model_name:
        model = {}
        if model_provider:
            model["provider"] = model_provider
        if model_name:
            model["name"] = model_name
        data["model"] = model
    
    if response_time_ms is not None:
        data["response_time_ms"] = response_time_ms
    
    audit_event(
        "response_sent",
        component="app",
        data=data
    )

