/**
 * HR Node implementation
 * Maps from Python nodes.py
 */

import { ChatGroq } from "@langchain/groq";
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { Runnable } from "@langchain/core/runnables";
import { EXECUTION_PROMPT, ROUTE_QUERY_PROMPT, GET_CONTEXT_PROMPT } from "./prompts.js";
import type { State, RouteQueryOutput } from "./state.js";
import { RouteQueryOutputSchema } from "./state.js";
import { getDocumentContext } from "./tools.js";
import * as logging_utils from "./logging_utils.js";

/**
 * HR Node class
 * Maps from Python HR_Node class
 */
export class HRNode {
  private llm: ChatGroq;
  private llmWithTools: Runnable;
  private tools: any[];

  constructor(llm: ChatGroq, tools: any[]) {
    this.llm = llm;
    this.tools = tools;
    this.llmWithTools = llm.bindTools(tools);
  }

  /**
   * Route query to determine if RAG is needed
   * Maps from Python route_query method
   */
  async route_query(state: State, config?: RunnableConfig): Promise<Partial<State>> {
    logging_utils.logNodeEntry("route_query");

    const user_query = state.user_query || "";
    const provided_document_name = state.document_name || "";

    // Build context for the LLM
    let query_context = user_query;
    if (provided_document_name) {
      query_context = `User Query: ${user_query}\n\nDocument Name Provided: ${provided_document_name}`;
    }

    const messages = [
      new SystemMessage({ content: ROUTE_QUERY_PROMPT }),
      new HumanMessage({ content: query_context }),
    ];

    const llm_with_structured_output = this.llm.withStructuredOutput(RouteQueryOutputSchema);
    const response = await llm_with_structured_output.invoke(messages, config);

    // Log the LLM routing decision
    logging_utils.logRoutingDecision(
      response.rag,
      response.document_name || null,
      response.rag_query || null,
      response.agent_query || null
    );

    return {
      messages: [
        new AIMessage({
          content: `RAG: ${response.rag}, Document: ${response.document_name || ""}`.trim(),
        }),
      ],
      rag: response.rag,
      document_name: response.document_name || "",
      user_query: user_query,
      rag_query: response.rag_query || "",
      agent_query: response.agent_query || "",
    };
  }

  /**
   * Route input based on rag flag
   * Maps from Python route_input method
   */
  route_input(state: State): string {
    logging_utils.logNodeEntry("route_input");
    const rag_needed = state.rag || false;
    const destination = rag_needed ? "get_context" : "hr_node";
    logging_utils.logger.info(`Routing to: ${destination} (rag_needed=${rag_needed})`);
    return destination;
  }

  /**
   * Get context by finding document ID and retrieving content
   * Maps from Python get_context method
   */
  async get_context(state: State, config?: RunnableConfig): Promise<Partial<State>> {
    logging_utils.logNodeEntry("get_context");

    const document_name = state.document_name || "";
    const employee_id = state.employee_id || "";

    const messages = [
      new SystemMessage({ content: GET_CONTEXT_PROMPT }),
      new HumanMessage({
        content: `Document Name: ${document_name}, Employee ID: ${employee_id}`,
      }),
      ...state.messages,
    ];

    // Bind get_document_context tool to LLM for this call
    const llm = this.llm.bindTools([getDocumentContext]);
    const response = await llm.invoke(messages, config);

    // Log all tool calls from the response
    logging_utils.logGetContextToolCalls(response);

    // Log all tool messages (tool results) from state
    const tool_messages = state.messages.filter(
      (msg): msg is ToolMessage => {
        // Check if message is a ToolMessage by checking for tool_call_id property
        return msg._getType ? msg._getType() === "tool" : false;
      }
    );
    logging_utils.logGetContextToolResults(tool_messages);

    // Find and log the last tool call result containing document information
    logging_utils.logLastToolResultForExtraction(tool_messages);

    return { messages: [response] };
  }

  /**
   * Execute the HR node
   * Maps from Python execute method
   */
  async execute(state: State, config?: RunnableConfig): Promise<Partial<State>> {
    logging_utils.logNodeEntry("hr_node (execute)");

    // Use agent_query if available (refined query), otherwise fall back to user_query
    const agent_query = state.agent_query || "";
    const user_query = state.user_query || "";
    const query_to_use = agent_query || user_query;

    const job_title = state.job_title || "";
    const employee_id = state.employee_id || "";
    const employee_name = state.employee_name || "";

    // Check if we have formatted_context from RAG (for combined queries)
    const formatted_context = state.formatted_context || "";

    // Include job title, employee ID, and employee name in user query context for authorization decisions
    let enhanced_query = query_to_use;
    if (job_title) {
      enhanced_query = `[User Job Title: ${job_title}, Employee ID: ${employee_id}, Employee Name: ${employee_name}]\n\n${query_to_use}`;
    }

    // If we have formatted_context from RAG, include it in the prompt
    if (formatted_context) {
      enhanced_query = `${enhanced_query}\n\nDocument Context:\n${formatted_context}`;
    }

    // Build messages with system prompt and conversation history
    const messages = [
      new SystemMessage({ content: EXECUTION_PROMPT }),
      new HumanMessage({ content: enhanced_query }),
      ...state.messages,
    ];

    const response = await this.llmWithTools!.invoke(messages, config);

    // Log the LLM response
    logging_utils.logExecuteResponse(response);

    return { messages: [response], job_title: job_title };
  }
}

