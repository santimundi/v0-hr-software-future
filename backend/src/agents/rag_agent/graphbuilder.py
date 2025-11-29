from langgraph.graph import START, StateGraph, END
from langgraph.prebuilt import tools_condition
from src.agents.hr_agent.state import State
from src.agents.rag_agent.nodes import RAG_Node
from langgraph.checkpoint.memory import MemorySaver

class RAG_Agent_GraphBuilder:
    def __init__(self, llm, tool_node, base_llm=None):
        self.llm = llm  # LLM with tools for database queries
        self.base_llm = base_llm # Base LLM without tools for structured output
        self.tool_node = tool_node


    def build_graph(self):

        self.graph = StateGraph(State)


        rag_node = RAG_Node(self.llm, self.base_llm)

        self.graph.add_node("get_document_id", rag_node.get_document_id)        
        self.graph.add_node("answer_query", rag_node.answer_query)
        self.graph.add_node("tools", self.tool_node)

        self.graph.add_edge(START, "get_document_id")
        self.graph.add_conditional_edges("get_document_id", tools_condition, {
            "tools": "tools",
            END: "answer_query",
        })
        
        self.graph.add_edge("tools", "get_document_id")
        self.graph.add_edge("answer_query", END)

        return self.graph.compile(checkpointer=MemorySaver())