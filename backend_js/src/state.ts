import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

/**
 * State definition for the HR Agent Chatbot
 * Maps from Python TypedDict to TypeScript using LangGraph Annotation
 */
export const StateAnnotation = Annotation.Root({
  /**
   * Messages array with reducer that appends messages
   * Equivalent to: Annotated[List[BaseMessage], add_messages] in Python
   */
  messages: Annotation<BaseMessage[]>({
    reducer: (x: BaseMessage[], y: BaseMessage[]) => [...(x || []), ...(y || [])],
    default: () => [],
  }),
  
  /**
   * User ID for conversation tracking
   */
  user_id: Annotation<string>({
    default: () => "",
  }),
  
  /**
   * User query string
   */
  user_query: Annotation<string>({
    default: () => "",
  }),
  
  /**
   * Conversation ID for checkpointing
   */
  conversation_id: Annotation<string>({
    default: () => "",
  }),
});

/**
 * TypeScript type for the State
 */
export type State = typeof StateAnnotation.State;

