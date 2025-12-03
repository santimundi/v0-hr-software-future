from langgraph.graph import START, StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from src.hr_agent.state import State
from src.hr_agent.nodes import HR_Node
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
        self.graph.add_node("hr_node", hr_node.process_query)
        self.graph.add_node("hitl_approval", hr_node.hitl_approval)
        self.graph.add_node("handle_hitl_approval", hr_node.handle_hitl_approval)
        self.graph.add_node("tools_hr", tool_node)

        # Start directly at the main HR node
        self.graph.add_edge(START, "hr_node")

        # After hr_node runs, decide whether to route to HITL, tools, or end
        self.graph.add_conditional_edges(
            "hr_node",
            hr_node.check_if_write_operation,
            {
                "hitl_approval": "hitl_approval",  # If a write is detected, route to HITL approval
                "tools_hr": "tools_hr",           # For normal tool execution (read operations)
                END: END,                         # If no tool calls, end
            }
        )

        # After HITL approval is handled, return to hr_node
        self.graph.add_edge("hitl_approval", "handle_hitl_approval")
        self.graph.add_edge("handle_hitl_approval", "hr_node")

        # After tools execute, return to hr_node
        self.graph.add_edge("tools_hr", "hr_node")
        
        self.graph.add_edge("hr_node", END)

        return self.graph.compile(checkpointer=MemorySaver())
        