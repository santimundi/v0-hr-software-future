from typing import Annotated, List, Optional, TypedDict, Dict, Any
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field
from uuid import UUID



class SummaryOutput(BaseModel):
    ai_summary: str = Field(description="One-line AI-generated summary of the document")
    title: str = Field(description="A simple one line ai generated title of the document")

class State(TypedDict):
    """
     Represents the state in the HR Agent Chatbot
    """
    messages: Annotated[List[BaseMessage], add_messages]
    employee_id: str
    employee_name: str
    content: str
    content_structured: Optional[Dict[str, Any]]
    filename: str
    file_bytes: bytes
    employee_uuid: Optional[UUID]
    title: str
    ai_summary: str
    file_url: Optional[str]
    created_at: Optional[str]
  