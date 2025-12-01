"""
Logging utility functions for HR agent nodes.

This module provides helper functions for consistent logging across all nodes,
including node entry/exit logging, tool call logging, and debug information.
"""

import logging
from typing import List, Any, Optional
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

