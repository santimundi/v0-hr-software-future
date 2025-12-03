"""
Logging utility functions for HR agent nodes.

This module provides helper functions for consistent logging across all nodes,
including node entry/exit logging, tool call logging, and debug information.
"""

import logging
from typing import List, Any, Optional, Dict
from langchain_core.messages import ToolMessage, AIMessage

logger = logging.getLogger(__name__)


def log_node_entry(node_name: str):
    """
    Log entry into a graph node with a clear visual separator.
    
    Args:
        node_name: Name of the node being entered
    """
    logger.info("=" * 80)
    logger.info(f">>> NODE: {node_name}")
    logger.info("=" * 80)


def log_tool_calls(response: AIMessage, context: str = ""):
    """
    Log tool calls from an LLM response.
    
    Args:
        response: The LLM response (AIMessage) that may contain tool calls
        context: Optional context string to include in log messages
    """
    if hasattr(response, 'tool_calls') and response.tool_calls:
        context_str = f" ({context})" if context else ""
        logger.info(f"LLM made {len(response.tool_calls)} tool call(s){context_str}:")
        for i, tool_call in enumerate(response.tool_calls, 1):
            tool_name = tool_call.get('name', 'unknown')
            tool_args = tool_call.get('args', {})
            logger.info(f"  Tool call {i}: {tool_name}")
            logger.info(f"    Arguments: {tool_args}")


def log_tool_messages(messages: List[Any], context: str = ""):
    """
    Log tool messages from a list of messages.
    
    Args:
        messages: List of messages that may contain ToolMessage instances
        context: Optional context string to include in log messages
    """
    tool_messages = [msg for msg in messages if isinstance(msg, ToolMessage)]
    if tool_messages:
        context_str = f" ({context})" if context else ""
        logger.info(f"Found {len(tool_messages)} tool message(s){context_str}:")
        for i, tool_msg in enumerate(tool_messages, 1):
            tool_name = getattr(tool_msg, 'name', 'unknown')
            tool_content = getattr(tool_msg, 'content', '')
            # Log first 500 chars of tool response to see query results
            content_preview = str(tool_content)[:500] if tool_content else "No content"
            logger.info(f"  Tool message {i}: {tool_name}")
            logger.info(f"    Response preview: {content_preview}")


def log_rag_context_debug(results: List[Any], rows_chunks: List[str]):
    """
    Log debug information about RAG context results and row chunks.
    
    Args:
        results: List of search results (tuples of Document and score)
        rows_chunks: List of row chunk strings
    """
    logger.debug(f"Results type: {type(results)}, Results length: {len(results) if isinstance(results, list) else 'N/A'}")
    if isinstance(results, list) and len(results) > 0:
        logger.debug(f"First result type: {type(results[0])}")
        if isinstance(results[0], tuple) and len(results[0]) >= 2:
            logger.debug(f"First result content (first 200 chars): {str(results[0][0])[:200]}")
            logger.debug(f"First result score: {results[0][1]}")
    
    logger.debug(f"Rows chunks type: {type(rows_chunks)}, Rows chunks length: {len(rows_chunks) if isinstance(rows_chunks, list) else 'N/A'}")
    if isinstance(rows_chunks, list) and len(rows_chunks) > 0:
        first_chunk_preview = rows_chunks[0][:200] if isinstance(rows_chunks[0], str) else str(rows_chunks[0])[:200]
        logger.debug(f"First row chunk (first 200 chars): {first_chunk_preview}")


def log_routing_decision(rag: bool, document_name: Optional[str], rag_query: Optional[str], agent_query: Optional[str]):
    """
    Log the routing decision made by the route_query node.
    
    Args:
        rag: Whether RAG is needed
        document_name: Inferred document name
        rag_query: Refined query for RAG
        agent_query: Refined query for agent
    """
    logger.info(f"Route query - RAG needed: {rag}, Document name: {document_name or 'None'}")
    logger.info(f"RAG query: {rag_query or 'None'}")
    logger.info(f"Agent query: {agent_query or 'None'}")


def log_get_context_tool_calls(response: AIMessage):
    """
    Log all tool calls from the get_context node's LLM response.
    
    Args:
        response: The LLM response from get_context
    """
    if hasattr(response, 'tool_calls') and response.tool_calls:
        logger.info(f"get_context - Tool calls made: {len(response.tool_calls)}")
        for i, tool_call in enumerate(response.tool_calls, 1):
            tool_name = tool_call.get('name', 'unknown')
            tool_args = tool_call.get('args', {})
            tool_id = tool_call.get('id', 'unknown')
            logger.info(f"get_context - Tool Call {i}:")
            logger.info(f"  Tool Name: {tool_name}")
            logger.info(f"  Tool ID: {tool_id}")
            logger.info(f"  Arguments: {tool_args}")
    else:
        logger.info(f"get_context - No tool calls in response")


def log_get_context_tool_results(tool_messages: List[ToolMessage]):
    """
    Log all tool results (tool messages) found in the state for get_context.
    
    Args:
        tool_messages: List of ToolMessage instances from state
    """
    if tool_messages:
        logger.info(f"get_context - Tool results found: {len(tool_messages)}")
        for i, tool_msg in enumerate(tool_messages, 1):
            tool_name = getattr(tool_msg, 'name', 'unknown')
            tool_id = getattr(tool_msg, 'tool_call_id', 'unknown')
            content_preview = str(tool_msg.content)[:500] if len(str(tool_msg.content)) > 500 else str(tool_msg.content)
            logger.info(f"get_context - Tool Result {i}:")
            logger.info(f"  Tool Name: {tool_name}")
            logger.info(f"  Tool Call ID: {tool_id}")
            logger.info(f"  Content (first 500 chars): {content_preview}")
            if len(str(tool_msg.content)) > 500:
                logger.info(f"  Content length: {len(str(tool_msg.content))} characters (truncated)")
    else:
        logger.info(f"get_context - No tool results found in state")


def log_last_tool_result_for_extraction(tool_messages: List[ToolMessage]):
    """
    Log the last tool call result containing document information for ID extraction.
    
    Args:
        tool_messages: List of ToolMessage instances from state
    """
    if tool_messages:
        last_tool_message = tool_messages[-1]
        logger.info(f"get_context - Last tool call result (for document ID extraction):")
        logger.info(f"  Tool: {getattr(last_tool_message, 'name', 'unknown')}")
        logger.info(f"  Full Content: {last_tool_message.content}")


def log_execute_response(response: AIMessage):
    """
    Log the LLM response from the execute node.
    
    Args:
        response: The LLM response from execute
    """
    response_content = response.content if hasattr(response, 'content') else str(response)
    logger.info(f"HR Agent execute response (first 500 chars): {response_content[:500]}")


def log_check_write_operation_message(last_message: Any):
    """
    Log the last message being checked in check_if_write_operation.
    
    Args:
        last_message: The last message from state
    """
    message_type = type(last_message).__name__
    message_content = str(last_message.content) if hasattr(last_message, 'content') else str(last_message)
    logger.info(f"check_if_write_operation - Last message type: {message_type}")
    logger.info(f"check_if_write_operation - Last message content: {message_content[:500]}..." if len(message_content) > 500 else f"check_if_write_operation - Last message content: {message_content}")


def log_check_write_operation_tool_calls(calls: List[Dict[str, Any]]):
    """
    Log all tool calls found in check_if_write_operation.
    
    Args:
        calls: List of tool call dictionaries
    """
    if not calls:
        logger.info("check_if_write_operation - No tool calls found, routing to END")
        return
    
    logger.info(f"check_if_write_operation - Found {len(calls)} tool call(s), checking for write operations")
    
    # Log all tool calls found
    for i, c in enumerate(calls, 1):
        name = c.get("name", "unknown")
        call_id = c.get("id", "unknown")
        args = c.get("args", {}) or {}
        logger.info(f"check_if_write_operation - Tool call {i}:")
        logger.info(f"  Tool name: {name}")
        logger.info(f"  Tool call ID: {call_id}")
        logger.info(f"  Arguments: {args}")


def log_check_write_operation_result(tool_name: str, is_write: bool, sql_query: str = "", routing_to: str = ""):
    """
    Log the result of checking a tool call for write operations.
    
    Args:
        tool_name: Name of the tool being checked
        is_write: Whether the operation is a write operation
        sql_query: The SQL query (if applicable)
        routing_to: Where the router is routing to
    """
    logger.info(f"check_if_write_operation - Tool: {tool_name}, Is write operation: {is_write}")
    if is_write and sql_query:
        logger.info(f"check_if_write_operation - Write SQL detected, routing to '{routing_to}'")
        logger.info(f"check_if_write_operation - SQL Query: {sql_query[:200]}..." if len(sql_query) > 200 else f"check_if_write_operation - SQL Query: {sql_query}")
    elif not is_write:
        logger.info(f"check_if_write_operation - No write operations detected, routing to '{routing_to}'")


def log_hitl_approval_request(sql_query: str):
    """
    Log when a write operation is detected and HITL approval is requested.
    
    Args:
        sql_query: The SQL query that needs approval
    """
    logger.info(f"hitl_approval - Write operation detected, requesting human approval")
    logger.info(f"hitl_approval - SQL Query: {sql_query[:200]}..." if len(sql_query) > 200 else f"hitl_approval - SQL Query: {sql_query}")


def log_hitl_approval_explanation(explanation: str):
    """
    Log the explanation generated for HITL approval.
    
    Args:
        explanation: The explanation generated by the LLM
    """
    logger.info(f"hitl_approval - Generated explanation for user approval")
    logger.info(f"hitl_approval - Explanation: {explanation[:200]}..." if len(explanation) > 200 else f"hitl_approval - Explanation: {explanation}")


def log_hitl_approval_feedback(user_feedback: Optional[str]):
    """
    Log the user feedback received for HITL approval.
    
    Args:
        user_feedback: The feedback provided by the user
    """
    logger.info(f"hitl_approval - User feedback received: {user_feedback[:200]}..." if user_feedback and len(user_feedback) > 200 else f"hitl_approval - User feedback received: {user_feedback}")


def log_handle_hitl_approval_start(user_feedback: str):
    """
    Log the start of handle_hitl_approval processing.
    
    Args:
        user_feedback: The user feedback being processed
    """
    logger.info(f"handle_hitl_approval - Processing user feedback: {user_feedback[:200]}..." if user_feedback and len(user_feedback) > 200 else f"handle_hitl_approval - Processing user feedback: {user_feedback}")


def log_handle_hitl_approval_tool_extraction(tool_call_id: Optional[str], tool_name: Optional[str], sql_query: str):
    """
    Log the extracted tool call information in handle_hitl_approval.
    
    Args:
        tool_call_id: The tool call ID
        tool_name: The tool name
        sql_query: The SQL query to execute
    """
    logger.info(f"handle_hitl_approval - Extracted tool call - ID: {tool_call_id}, Name: {tool_name}")
    logger.info(f"handle_hitl_approval - SQL Query to execute: {sql_query[:200]}..." if len(sql_query) > 200 else f"handle_hitl_approval - SQL Query to execute: {sql_query}")


def log_handle_hitl_approval_decision(approved: bool):
    """
    Log the approval decision from the LLM.
    
    Args:
        approved: Whether the operation was approved
    """
    logger.info(f"handle_hitl_approval - LLM determined approval status: {approved}")


def log_handle_hitl_approval_execution(sql_query: str, success: bool, result: Optional[str] = None, error: Optional[str] = None):
    """
    Log the SQL execution result in handle_hitl_approval.
    
    Args:
        sql_query: The SQL query that was executed
        success: Whether the execution was successful
        result: The execution result (if successful)
        error: The error message (if failed)
    """
    if success:
        logger.info("handle_hitl_approval - Operation APPROVED, executing SQL query")
        logger.info(f"handle_hitl_approval - Invoking execute_sql tool with query")
        logger.info(f"handle_hitl_approval - SQL execution successful")
        if result:
            result_preview = result[:500] if len(result) > 500 else result
            logger.info(f"handle_hitl_approval - Tool result (first 500 chars): {result_preview}")
    else:
        logger.error(f"handle_hitl_approval - {error}", exc_info=True)


def log_handle_hitl_approval_rejection():
    """
    Log when the operation is rejected by the user.
    """
    logger.info("handle_hitl_approval - Operation REJECTED by user, no changes will be made")
