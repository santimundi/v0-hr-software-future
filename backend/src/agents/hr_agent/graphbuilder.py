from langgraph.graph import START, StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from src.agents.hr_agent.state import State
from src.agents.hr_agent.nodes import HR_Node
from langgraph.checkpoint.memory import MemorySaver


class HR_Agent_GraphBuilder:
    """
    This class builds the graph used to execute HR queries based on the user's query.
    """

    def __init__(self, llm, tool_node, rag_graph):
        self.llm = llm
        self.tool_node = tool_node
        self.rag_graph = rag_graph
        self.graph = StateGraph(State)


    
    def build_graph(self):
        """
        Builds the graph used to execute HR queries based on the user's query.
        """
        
        # Initialize the HR node
        hr_node = HR_Node(self.llm, self.rag_graph)

        # Use provided tool_node (should be passed from app startup)
        if self.tool_node is None:
            raise ValueError("tool_node must be provided to GraphBuilder")

        # Add the nodes to the graph
        self.graph.add_node("route_query", hr_node.route_query)
        self.graph.add_node("hr_node", hr_node.execute)
        self.graph.add_node("rag_subgraph", self.rag_graph)
        self.graph.add_node("tools", self.tool_node)
        
        # Add the edges to the graph
        self.graph.add_edge(START, "route_query")
        self.graph.add_conditional_edges(
            "route_query", 
            hr_node.route_input, {
                "rag_node": "rag_subgraph",
                "hr_node": "hr_node",
            }
        )

        
        self.graph.add_conditional_edges(
            "hr_node",
            tools_condition,
            {
                "tools": "tools",
                END: END
            }
        )
        
        # After tools execute, route back to hr_node
        self.graph.add_edge("tools", "hr_node")
        
        self.graph.add_edge("rag_subgraph", END)

        return self.graph.compile(checkpointer=MemorySaver())
        