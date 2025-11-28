from langgraph.graph import START, StateGraph, END
from langgraph.prebuilt import tools_condition
from src.agents.db_agent.state import State
from src.agents.db_agent.nodes import DB_Node
from langgraph.checkpoint.memory import MemorySaver


class DB_Agent_GraphBuilder:
    """
    This class builds the graph used to execute DB operations.
    """

    def __init__(self, llm, tool_node):
        self.llm = llm
        self.tool_node = tool_node
        self.graph = StateGraph(State)

    
    def build_graph(self):

        db_node = DB_Node(self.llm)

        self.graph.add_node("extract_text", db_node.read_file)
        self.graph.add_node("get_employee_uuid", db_node.get_employee_uuid)
        self.graph.add_node("generate_summary", db_node.generate_summary)
        self.graph.add_node("upload_to_storage", db_node.upload_to_storage)
        self.graph.add_node("update_table", db_node.update_table)
        self.graph.add_node("tools", self.tool_node)

        self.graph.add_edge(START, "extract_text")
        self.graph.add_edge("extract_text", "upload_to_storage")
        self.graph.add_edge("upload_to_storage", "generate_summary")
        self.graph.add_edge("generate_summary", "get_employee_uuid")


        self.graph.add_conditional_edges(
            "get_employee_uuid",
            tools_condition,
            {
                "tools": "tools",
                END: "update_table"
            }
        )

        self.graph.add_edge("tools", "get_employee_uuid")

        self.graph.add_edge("update_table", END)

        return self.graph.compile()