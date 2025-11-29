from typing import Annotated, List, Literal, TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field


class RouteQueryOutput(BaseModel):
    decision: Literal["rag", "agent"] = Field(description="The route to take based on the user's query. Must be either 'rag' or 'agent'")
    document_name: str = Field(description="The name of the document to search for")


class State(TypedDict):
    """
     Represents the state in the HR Agent Chatbot
    """
    messages: Annotated[List[BaseMessage], add_messages]
    user_query: str
    employee_id: str
    employee_name: str
    job_title: str
    decision: Literal["rag", "agent"]
    document_name: str
    document_id: str