/**
 * HR Node implementation
 * Maps from Python nodes.py
 */

import { ChatGroq } from "@langchain/groq";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import { PROMPT } from "./prompts.js";
import { getMcpTools } from "./tools.js";
import type { State } from "./state.js";

/**
 * HR Node class
 * Maps from Python HR_Node class
 */
export class HRNode {
  private llm: ChatGroq;

  constructor(llm: ChatGroq) {
    this.llm = llm;
  }

  /**
   * Execute the HR node
   * Maps from Python execute method
   */
  async execute(state: State, config?: RunnableConfig): Promise<Partial<State>> {
    const userQuery = state.messages[state.messages.length - 1]?.content || "";

    // Get actual tools (async function that uses cached tools)
    const tools = await getMcpTools();
    const llmWithTools = this.llm.bindTools(tools);

    // Build messages with system prompt and conversation history
    const messages = [
      new SystemMessage({ content: PROMPT }),
      new HumanMessage({ content: userQuery }),
      ...state.messages,
    ];

    // Use invoke for async execution
    const response = await llmWithTools.invoke(messages, config);

    return {
      messages: [response],
      user_query: userQuery,
    };
  }
}

