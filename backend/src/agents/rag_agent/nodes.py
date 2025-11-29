import logging
from src.agents.rag_agent.tools import get_context
from src.agents.hr_agent.state import State
from src.agents.rag_agent.prompts import GET_DOCUMENT_ID_PROMPT, ANSWER_QUERY_PROMPT
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

logger = logging.getLogger(__name__)



class RAG_Node:
    def __init__(self, llm, base_llm=None):
        self.llm = llm  # LLM with tools for database queries
        self.base_llm = base_llm   # Base LLM without tools for structured output

    def get_document_id(self, state: State) -> State:
        user_query = state['user_query']
        document_name = state["document_name"]
        employee_id = state["employee_id"]

        messages = [
            SystemMessage(content=GET_DOCUMENT_ID_PROMPT),
            HumanMessage(content=f"Document Name: {document_name}, Employee ID: {employee_id}"),
            *state["messages"],
        ]

        response = self.llm.invoke(messages)

        document_id = response.content.strip().replace('"', '')
        
        # Log the document ID
        logger.info(f"Retrieved document ID: {document_id} for document name: {document_name}, employee ID: {employee_id}")
        
        return {
            "messages": [response], 
            "user_query": user_query,
            "document_id": document_id,
        }
    

    def answer_query(self, state: State) -> State:
        document_id = state["document_id"]
        user_query = state["user_query"]

        results, rows_chunks = get_context(document_id, user_query)
        
        # Log debug information
        logger.info(f"Answer query - Document ID: {document_id}, User Query: {user_query}")
        logger.debug(f"Results type: {type(results)}, Results length: {len(results) if isinstance(results, list) else 'N/A'}")
        
        if isinstance(results, list) and len(results) > 0:
            logger.debug(f"First result type: {type(results[0])}")
            if isinstance(results[0], tuple) and len(results[0]) >= 2:
                logger.debug(f"First result content (first 200 chars): {str(results[0][0])[:200]}")
                logger.debug(f"First result score: {results[0][1]}")
            else:
                logger.debug(f"First result: {str(results[0])[:200]}")
        
        logger.debug(f"Rows chunks type: {type(rows_chunks)}, Rows chunks length: {len(rows_chunks) if isinstance(rows_chunks, list) else 'N/A'}")
        if isinstance(rows_chunks, list) and len(rows_chunks) > 0:
            first_chunk_preview = rows_chunks[0][:200] if isinstance(rows_chunks[0], str) else str(rows_chunks[0])[:200]
            logger.debug(f"First row chunk (first 200 chars): {first_chunk_preview}")


        messages = [
            SystemMessage(content=ANSWER_QUERY_PROMPT),
            SystemMessage(content=f"Document Information:\n{results}"),
            SystemMessage(content=f"Structured Data:\n{rows_chunks}"),
            HumanMessage(content=user_query),
        ]

        response = self.base_llm.invoke(messages)
        return { "messages": [AIMessage(content=response.content)],}

        

       

        
        