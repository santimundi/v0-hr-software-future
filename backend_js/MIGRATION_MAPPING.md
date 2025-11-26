# Python to TypeScript Migration Mapping

This document shows the mapping between the Python FastAPI backend and the TypeScript LangGraph.js backend.

## File Structure Mapping

| Python File | TypeScript File | Description |
|------------|-----------------|-------------|
| `app.py` | `src/app.ts` | FastAPI → Express.js server |
| `src/state.py` | `src/state.ts` | TypedDict → LangGraph Annotation |
| `src/nodes.py` | `src/nodes.ts` | HR Node class |
| `src/graphbuilder.py` | `src/graphbuilder.ts` | Graph builder class |
| `src/tools.py` | `src/tools.ts` | MCP tools integration |
| `src/prompts.py` | `src/prompts.ts` | System prompts |
| `requirements.txt` | `package.json` | Dependencies |
| `pyproject.toml` | `tsconfig.json` | Project configuration |
| `langgraph.json` | `langgraph.json` | LangGraph config (similar) |
| `mcp.json` | `mcp.json` | MCP config (identical) |

## Code Mapping

### 1. State Definition

**Python (`state.py`):**
```python
from typing import Annotated, List, TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class State(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    user_id: str
    user_query: str
    conversation_id: str
```

**TypeScript (`state.ts`):**
```typescript
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

export const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => [...(x || []), ...(y || [])],
    default: () => [],
  }),
  user_id: Annotation<string>({ default: () => "" }),
  user_query: Annotation<string>({ default: () => "" }),
  conversation_id: Annotation<string>({ default: () => "" }),
});
```

### 2. Server Setup

**Python (`app.py`):**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, ...)
```

**TypeScript (`app.ts`):**
```typescript
import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ ... }));
```

### 3. Graph Building

**Python (`graphbuilder.py`):**
```python
from langgraph.graph import START, StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition

class GraphBuilder:
    def build_graph(self):
        self.graph = StateGraph(State)
        self.graph.add_node("hr_node", hr_node.execute)
        self.graph.add_node("tools", self.tool_node)
        self.graph.add_edge(START, "hr_node")
        self.graph.add_conditional_edges("hr_node", tools_condition, ...)
        return self.graph.compile(checkpointer=MemorySaver())
```

**TypeScript (`graphbuilder.ts`):**
```typescript
import { StateGraph, START, END } from "@langchain/langgraph";
import { toolsCondition } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph/checkpoint/memory";

class GraphBuilder {
  buildGraph() {
    this.graph = new StateGraph(StateAnnotation);
    this.graph.addNode("hr_node", (state, config) => hrNode.execute(state, config));
    this.graph.addNode("tools", this.toolNode);
    this.graph.addEdge(START, "hr_node");
    this.graph.addConditionalEdges("hr_node", toolsCondition, ...);
    return this.graph.compile({ checkpointer: new MemorySaver() });
  }
}
```

### 4. MCP Tools Integration

**Python (`tools.py`):**
```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools

_client = MultiServerMCPClient(mcp_servers)
_session = await _client.session(server_name)
_tools = await load_mcp_tools(_session)
```

**TypeScript (`tools.ts`):**
```typescript
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

_client = new MultiServerMCPClient({
  mcpServers: mcpServers,
  useStandardContentBlocks: true,
});
_tools = await _client.getTools();
```

### 5. API Endpoints

**Python:**
```python
@app.post("/query")
async def answer_query(request: Request):
    data = await request.json()
    response = await graph.ainvoke(...)
    return {"data": response["messages"][-1].content}
```

**TypeScript:**
```typescript
app.post("/query", async (req: Request, res: Response) => {
  const { query, user_id } = req.body;
  const response = await graph.invoke(...);
  res.json({ data: response.messages[response.messages.length - 1].content });
});
```

## Key Differences

1. **Type System**: Python uses `TypedDict` and type hints; TypeScript uses interfaces and Zod schemas
2. **Async/Await**: Both use async/await, but JavaScript runtime is different
3. **State Management**: Python uses `Annotated` with reducers; TypeScript uses `Annotation` API
4. **Package Management**: Python uses `pip`/`uv`; TypeScript uses `npm`/`pnpm`
5. **Runtime**: Python uses uvicorn; TypeScript uses Node.js
6. **MCP Client**: Python uses `load_mcp_tools`; TypeScript uses `getTools()` method

## Environment Variables

Both versions use the same `.env.local` file:
- `GROQ_API_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_ACCESS_TOKEN`

## API Compatibility

The `/query` endpoint maintains the same interface:
- **Request**: `{ "query": string, "user_id": string }`
- **Response**: `{ "data": string }`

Both versions run on port 8000 by default.

