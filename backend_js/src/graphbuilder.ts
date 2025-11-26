/**
 * Graph Builder for HR Agent
 * Maps from Python graphbuilder.py
 */

import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { toolsCondition } from "@langchain/langgraph/prebuilt";
import { ChatGroq } from "@langchain/groq";
import type { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateAnnotation } from "./state.js";
import { HRNode } from "./nodes.js";

/**
 * GraphBuilder class
 * Maps from Python GraphBuilder class
 */
export class GraphBuilder {
  private llm: ChatGroq;
  private toolNode: ToolNode | null;
  private graph: StateGraph<any>;

  constructor(llm: ChatGroq, toolNode: ToolNode | null) {
    this.llm = llm;
    this.toolNode = toolNode;
    this.graph = new StateGraph(StateAnnotation);
  }

  /**
   * Builds the graph used to execute HR queries
   * Maps from Python build_graph method
   */
  buildGraph() {
    // Initialize the HR node
    const hrNode = new HRNode(this.llm);

    // Use provided tool_node (should be passed from app startup)
    if (this.toolNode === null) {
      throw new Error("tool_node must be provided to GraphBuilder");
    }

    // Build the graph using method chaining
    const compiledGraph = new StateGraph(StateAnnotation)
      // Add the nodes to the graph
      .addNode("hr_node", (state, config) => hrNode.execute(state, config))
      .addNode("tools", this.toolNode)
      // Add the edges to the graph
      .addEdge(START, "hr_node")
      // Conditional edge: if tools are needed, route to tools, otherwise END
      .addConditionalEdges("hr_node", toolsCondition, {
        tools: "tools",
        __end__: END,
      })
      // After tools execute, route back to hr_node
      .addEdge("tools", "hr_node")
      // Compile with memory checkpointing
      .compile({
        checkpointer: new MemorySaver(),
      });

    return compiledGraph;
  }
}

// Export the graph for langgraph.json
// This will be built at runtime in app.ts
export let graph: ReturnType<GraphBuilder["buildGraph"]> | null = null;

