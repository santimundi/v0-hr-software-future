from langgraph.graph import START, StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from src.agents.hr_agent.state import State
from src.agents.hr_agent.nodes import HR_Node
from langgraph.checkpoint.memory import MemorySaver


class HR_Agent_GraphBuilder:
    """
    This class builds the graph used to execute HR queries based on the user's query.
    """

    def __init__(self, llm, tools):
        self.llm = llm
        self.tools = tools
        self.graph = StateGraph(State)


    
    def build_graph(self):
        """
        Builds the graph used to execute HR queries based on the user's query.
        """
        
        # Initialize the HR node
        hr_node = HR_Node(self.llm, self.tools)

        # Create ToolNode with handle_tool_errors=True to convert exceptions to tool messages
        tool_node = ToolNode(self.tools, handle_tool_errors=True)
       
        # Add the nodes to the graph
        self.graph.add_node("route_query", hr_node.route_query)
        self.graph.add_node("hr_node", hr_node.execute)
        self.graph.add_node("get_context", hr_node.get_context)
        self.graph.add_node("get_document_id", hr_node.get_document_id)
        self.graph.add_node("tools_rag", tool_node)
        self.graph.add_node("tools_hr", tool_node)
        

        self.graph.add_edge(START, "route_query")

        self.graph.add_conditional_edges(
            "route_query",
            hr_node.route_input,
            {
                "get_context": "get_context",  # When rag is true, route to get_context
                "hr_node": "hr_node",    # When rag is false, route to hr_node
            }
        )

        self.graph.add_conditional_edges(
            "get_context",
            tools_condition,
            {
                "tools": "tools_rag",
                END: "get_document_id",
            }
        )

        self.graph.add_edge("tools_rag", "get_context")


        self.graph.add_edge("get_document_id", "hr_node")

        self.graph.add_conditional_edges(
            "hr_node",
            tools_condition,
            {
                "tools": "tools_hr",  # If LLM wants to call tools, route to tools node
                END: END,  # If no tool calls, end
            }
        )

        
        self.graph.add_edge("tools_hr", "hr_node")
        self.graph.add_edge("hr_node", END)

        return self.graph.compile(checkpointer=MemorySaver())
        