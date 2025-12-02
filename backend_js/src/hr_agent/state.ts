import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { z } from "zod";

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
   * Employee ID for conversation tracking (constant, guaranteed to remain the same)
   */
  employee_id: Annotation<string>({
    reducer: (x: string, y: string) => y || x,
    default: () => "",
  }),
  
  /**
   * Employee name
   */
  employee_name: Annotation<string>({
    reducer: (x: string, y: string) => y || x,
    default: () => "",
  }),
  
  /**
   * User query string
   */
  user_query: Annotation<string>({
    reducer: (x: string, y: string) => y || x,
    default: () => "",
  }),
  
  /**
   * Job title/level (e.g., "Senior Software Engineer", "HR Director")
   */
  job_title: Annotation<string>({
    reducer: (x: string, y: string) => y || x,
    default: () => "",
  }),
  
  /**
   * Whether RAG is needed for this query
   */
  rag: Annotation<boolean>({
    reducer: (x: boolean, y: boolean) => y !== undefined ? y : x,
    default: () => false,
  }),
  
  /**
   * Document name for RAG queries
   */
  document_name: Annotation<string>({
    reducer: (x: string, y: string) => y || x,
    default: () => "",
  }),
  
  /**
   * Document ID (UUID) for RAG queries
   */
  document_id: Annotation<string>({
    reducer: (x: string, y: string) => y || x,
    default: () => "",
  }),
  
  /**
   * Formatted context string ready for LLM (from RAG)
   */
  formatted_context: Annotation<string>({
    reducer: (x: string, y: string) => y || x,
    default: () => "",
  }),
  
  /**
   * Refined query for RAG system
   */
  rag_query: Annotation<string>({
    reducer: (x: string, y: string) => y || x,
    default: () => "",
  }),
  
  /**
   * Refined query for agent system
   */
  agent_query: Annotation<string>({
    reducer: (x: string, y: string) => y || x,
    default: () => "",
  }),
});

/**
 * TypeScript type for the State
 */
export type State = typeof StateAnnotation.State;

/**
 * RouteQueryOutput schema (equivalent to Python Pydantic model)
 */
export const RouteQueryOutputSchema = z.object({
  rag: z.boolean().describe("Whether to route to the RAG system"),
  rag_query: z.string().optional().default("").describe("The query to pass to the RAG system"),
  agent_query: z.string().optional().default("").describe("The query to pass to the agent system"),
  document_name: z.string().optional().nullable().default(null).describe("The name of the document to search for"),
});

export type RouteQueryOutput = z.infer<typeof RouteQueryOutputSchema>;

/**
 * DocumentIdOutput schema (equivalent to Python Pydantic model)
 */
export const DocumentIdOutputSchema = z.object({
  document_id: z.string().describe("The ID of the document to search for"),
});

export type DocumentIdOutput = z.infer<typeof DocumentIdOutputSchema>;

