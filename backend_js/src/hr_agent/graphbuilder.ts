/**
 * Graph Builder for HR Agent
 * Maps from Python graphbuilder.py
 */

import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { toolsCondition, ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatGroq } from "@langchain/groq";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { StateAnnotation } from "./state.js";
import { HRNode } from "./nodes.js";
import { getDocumentContext } from "./tools.js";

/**
 * GraphBuilder class
 * Maps from Python GraphBuilder class
 */
export class GraphBuilder {
  private llm: ChatGroq;
  private tools: StructuredToolInterface[];
  private graph: StateGraph<any>;

  constructor(llm: ChatGroq, tools: StructuredToolInterface[]) {
    this.llm = llm;
    // Include get_document_context tool in the tools list
    this.tools = [...tools, getDocumentContext];
    this.graph = new StateGraph(StateAnnotation);
  }

  /**
   * Builds the graph used to execute HR queries
   * Maps from Python build_graph method
   */
  buildGraph() {
    // Initialize the HR node
    const hrNode = new HRNode(this.llm, this.tools);

    // Create ToolNode with all tools (MCP + get_document_context)
    const toolNode = new ToolNode(this.tools, { handleToolErrors: true });

    // Build the graph using method chaining
    const graph = new StateGraph(StateAnnotation)
      // Add the nodes to the graph
      .addNode("route_query", (state, config) => hrNode.route_query(state, config))
      .addNode("hr_node", (state, config) => hrNode.execute(state, config))
      .addNode("get_context", (state, config) => hrNode.get_context(state, config))
      .addNode("tools_rag", toolNode)
      .addNode("tools_hr", toolNode)
      // Add the edges to the graph
      .addEdge(START, "route_query")
      // Conditional edge: route based on rag flag
      .addConditionalEdges("route_query", (state) => hrNode.route_input(state), {
        get_context: "get_context",
        hr_node: "hr_node",
      })
      // Conditional edge: if tools are needed in get_context, route to tools_rag
      .addConditionalEdges("get_context", toolsCondition, {
        tools: "tools_rag",
        __end__: "hr_node",
      })
      // After tools_rag execute, route back to get_context
      .addEdge("tools_rag", "get_context")
      // Conditional edge: if tools are needed in hr_node, route to tools_hr
      .addConditionalEdges("hr_node", toolsCondition, {
        tools: "tools_hr",
        __end__: END,
      })
      // After tools_hr execute, route back to hr_node
      .addEdge("tools_hr", "hr_node")
      // Compile with memory checkpointing
      .compile({
        checkpointer: new MemorySaver(),
      });

    return graph;
  }
}

// Export the graph for langgraph.json
// This will be built at runtime in app.ts
export let graph: ReturnType<GraphBuilder["buildGraph"]> | null = null;

