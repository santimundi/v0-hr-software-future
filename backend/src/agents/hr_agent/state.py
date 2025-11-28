from typing import Annotated, List, TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class State(TypedDict):
    """
     Represents the state in the HR Agent Chatbot
    """
    messages: Annotated[List[BaseMessage], add_messages]
    employee_id: str
    employee_name: str
    user_query: str
    job_title: str
    conversation_id: str