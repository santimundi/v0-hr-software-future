from langgraph.graph import START, StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from src.hr_agent.state import State
from src.hr_agent.nodes import HR_Node
from src.hr_agent.tools import get_rag_tools
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

        # Get RAG tools and combine with MCP tools for ToolNode
        # The ToolNode needs access to all tools that the LLM can call
        all_tools = self.tools + get_rag_tools()

        # Create ToolNode with handle_tool_errors=True to convert exceptions to tool messages
        # Include both MCP tools and RAG tools so all tool calls can be executed
        tool_node = ToolNode(all_tools, handle_tool_errors=True)

        # Add the nodes to the graph
        self.graph.add_node("summarize_query", hr_node.summarize_query_topic)
        self.graph.add_node("policy_studio", hr_node.policy_studio)
        self.graph.add_node("parse_studio_results", hr_node.parse_studio_results)
        self.graph.add_node("process_query", hr_node.process_query)
        self.graph.add_node("hitl_approval", hr_node.hitl_approval)
        self.graph.add_node("handle_hitl_approval", hr_node.handle_hitl_approval)
        self.graph.add_node("tools_hr", tool_node)
        self.graph.add_node("tools_policy_studio", tool_node)

        # Start with query summarization, then proceed to main HR node
        self.graph.add_edge(START, "summarize_query")
        self.graph.add_conditional_edges(
            "summarize_query", 
            hr_node.route_input,
            {
                "policy_studio": "policy_studio",
                "process_query": "process_query",
            }
        )

        
        self.graph.add_conditional_edges(
            "policy_studio",
            tools_condition,
            {
                "tools": "tools_policy_studio",  # tools_condition returns 'tools' key
                END: "parse_studio_results",
            }
        )

        self.graph.add_edge("tools_policy_studio", "policy_studio")

        # After process_query runs, decide whether to route to HITL, tools, or end
        self.graph.add_conditional_edges(
            "process_query",
            hr_node.check_if_write_operation,
            {
                "hitl_approval": "hitl_approval",  # If a write is detected, route to HITL approval
                "tools_hr": "tools_hr",           # For normal tool execution (read operations)
                END: END,                         # If no tool calls, end
            }
        )

        # After HITL approval is handled, return to hr_node
        self.graph.add_edge("hitl_approval", "handle_hitl_approval")
        self.graph.add_edge("handle_hitl_approval", "process_query")

        # After tools execute, return to hr_node
        self.graph.add_edge("tools_hr", "process_query")
        
        self.graph.add_edge("parse_studio_results", END)
        self.graph.add_edge("process_query", END)

        return self.graph.compile()
        