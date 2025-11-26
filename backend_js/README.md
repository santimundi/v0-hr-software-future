# HR Agent Backend (LangGraph.js)

This is the TypeScript/JavaScript version of the HR Agent backend, migrated from Python FastAPI to use LangGraph.js.

## Architecture

This backend is equivalent to the Python version in `../backend/` but uses:
- **Express.js** instead of FastAPI
- **LangGraph.js** instead of Python LangGraph
- **TypeScript** instead of Python
- **@langchain/mcp-adapters** for MCP tool integration

## Project Structure

```
backend_js/
├── src/
│   ├── app.ts          # Express.js server (maps from app.py)
│   ├── state.ts        # State definition (maps from state.py)
│   ├── nodes.ts        # HR Node implementation (maps from nodes.py)
│   ├── graphbuilder.ts # Graph builder (maps from graphbuilder.py)
│   ├── tools.ts        # MCP tools integration (maps from tools.py)
│   └── prompts.ts      # System prompts (maps from prompts.py)
├── package.json
├── tsconfig.json
├── langgraph.json      # LangGraph configuration
├── mcp.json            # MCP server configuration
└── README.md
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file with your environment variables:
```env
GROQ_API_KEY=your_groq_api_key
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_ACCESS_TOKEN=your_supabase_access_token
```

3. Run in development mode:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

### POST /query
Main endpoint for HR queries.

**Request:**
```json
{
  "query": "What's my vacation balance?",
  "user_id": "user123"
}
```

**Response:**
```json
{
  "data": "Your vacation balance is 15 days..."
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "graph_initialized": true
}
```

## Key Differences from Python Version

1. **State Management**: Uses LangGraph.js `Annotation` API instead of Python `TypedDict`
2. **Async/Await**: JavaScript async/await (similar to Python but different runtime)
3. **MCP Integration**: Uses `@langchain/mcp-adapters` package
4. **Server**: Express.js instead of FastAPI with uvicorn
5. **Type Safety**: TypeScript types instead of Python type hints

## Development

The server runs on `http://localhost:8000` by default (same as Python version).

For LangGraph Platform deployment:
```bash
npm run langgraph
```

