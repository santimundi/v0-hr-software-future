from typing import Annotated, List, TypedDict, Optional
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field


        
class UserFeedbackOutput(BaseModel):
    approved: bool = Field(description="Whether the user has approved the write operation")


class State(TypedDict):
    """
     Represents the state in the HR Agent Chatbot
    """
    messages: Annotated[List[BaseMessage], add_messages]
    user_query: str = Field(default="", description="The user's original query")
    rag_query: str = Field(default="", description="The query to pass to the RAG system")
    agent_query: str = Field(default="", description="The query to pass to the agent system")
    employee_id: str = Field(default="", description="The employee ID of the user")
    employee_name: str = Field(default="", description="The name of the user")
    job_title: str = Field(default="", description="The job title of the user")
    document_name: str = Field(default="", description="The name of the document to search for")
    document_id: str = Field(default="", description="The ID of the document to search for")
    formatted_context: str = Field(default="", description="The formatted context of the document")
    user_feedback: Optional[str] = Field(description="The user's feedback on the write operation")
    rag: bool = Field(default=False, description="Whether to route to the RAG system")