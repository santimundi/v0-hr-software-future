from typing import Annotated, List, Literal, TypedDict, Tuple, Optional
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field
from langchain_core.documents import Document


class RouteQueryOutput(BaseModel):
    rag : bool = Field(description="Whether to route to the RAG system")
    rag_query: Optional[str] = Field(default="", description="The query to pass to the RAG system")
    agent_query: Optional[str] = Field(default="", description="The query to pass to the agent system")
    document_name: Optional[str] = Field(default=None, description="The name of the document to search for")


class DocumentIdOutput(BaseModel):
    document_id: str = Field(description="The ID of the document to search for")

class State(TypedDict):
    """
     Represents the state in the HR Agent Chatbot
    """
    messages: Annotated[List[BaseMessage], add_messages]
    user_query: str
    employee_id: str
    employee_name: str
    job_title: str
    rag: bool
    document_name: str
    document_id: str
    formatted_context: str  # Formatted context string ready for LLM
    rag_query: str  # Refined query for RAG system
    agent_query: str  # Refined query for agent system
    messages_length: Optional[int] = 0