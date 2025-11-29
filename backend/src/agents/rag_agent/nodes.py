from src.agents.rag_agent.tools import get_context
from src.agents.hr_agent.state import State
from src.agents.rag_agent.prompts import GET_DOCUMENT_ID_PROMPT, ANSWER_QUERY_PROMPT
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage



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
        return {
            "messages": [response], 
            "user_query": user_query,
            "document_id": document_id,
        }
    

    def answer_query(self, state: State) -> State:
        document_id = state["document_id"]
        user_query = state["user_query"]

        results, rows_chunks = get_context(document_id, user_query)
        
        messages = [
            SystemMessage(content=ANSWER_QUERY_PROMPT),
            SystemMessage(content=f"Document Information:\n{results}"),
            SystemMessage(content=f"Structured Data:\n{rows_chunks}"),
            HumanMessage(content=user_query),
        ]

        response = self.base_llm.invoke(messages)
        return { "messages": [AIMessage(content=response.content)],}

        

       

        
        