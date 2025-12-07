from typing import Annotated, List, Literal, TypedDict, Optional, Dict, Any
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field

class QuerySummaryOutput(BaseModel):
    query_topic: str = Field(description="A very short, precise topic summary (3-6 words max) for this user query.")
    policy_studio: bool = Field(default=False, description="Whether the user query is a policy studio test case")


class ConflictingClauses(BaseModel):
    """Details about conflicting policy clauses"""
    policy1: str = Field(description="Name of the first policy document")
    policy2: str = Field(description="Name of the second policy document")
    clause1: str = Field(description="The conflicting clause from policy1")
    clause2: str = Field(description="The conflicting clause from policy2")



class TestScenarioResult(BaseModel):
    """Result of evaluating a single test scenario"""
    status: Literal["clear", "ambiguous", "conflict"] = Field(
        description="Classification: 'clear' if policy yields one consistent answer, 'ambiguous' if unclear, 'conflict' if two docs disagree"
    )
    sections_checked: List[str] = Field(
        description="List of policy sections/documents that were checked (e.g., ['PTO Policy §3.2', 'Employee Handbook §5.1'])"
    )
    issue: Optional[str] = Field(
        default=None,
        description="Description of the issue found (required for 'ambiguous' or 'conflict' status)"
    )
    suggested_fix: Optional[str] = Field(
        default=None,
        description="Suggested fix or clarification (required for 'ambiguous' or 'conflict' status)"
    )
    conflicting_clauses: Optional[ConflictingClauses] = Field(
        default=None,
        description="Details about conflicting clauses (required only for 'conflict' status)"
    )


class PolicyTestResults(BaseModel):
    """Results for all test scenarios"""
    results: List[TestScenarioResult] = Field(
        description="List of test results, one for each scenario evaluated"
    )



class State(TypedDict):
    """
     Represents the state in the HR Agent Chatbot
    """
    messages: Annotated[List[BaseMessage], add_messages]
    user_query: str = Field(default="", description="The user's original query")
    query_topic: str = Field(default="", description="Short topic summary of the query (3-6 words)")
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
    policy_studio: bool = Field(default=False, description="Whether the user query is a policy studio test case")
    policy_test_results: Optional[List[Dict[str, Any]]] = Field(default=None, description="The serialized results of the policy studio test case")