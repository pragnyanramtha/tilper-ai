# Architecture Overview: Tilper AI

This document outlines the high-level architecture and data flow of the Tilper AI system.

## System Components

### 1. Client (Frontend)
- **Framework**: React (Vite-based).
- **Routing**: `wouter` for lightweight client-side routing.
- **State**: TanStack Query for server state; standard React hooks for local UI state.
- **Key Modules**:
    - `pages/dashboard.tsx`: Main overview of learning plans and challenges.
    - `pages/ide.tsx`: The coding environment where students solve challenges.
    - `components/ai-mentor-chat.tsx`: The primary interface for interacting with the AI Mentor.
    - `components/app-sidebar.tsx`: Navigation and persistence of the student's context.

### 2. Server (Backend)
- **Framework**: Express v5.
- **Real-time**: Custom WebSocket implementation for streaming AI responses.
- **Logic**: Centralized in `server/routes.ts`.
- **Database**: PostgreSQL with Drizzle ORM.
- **Key Modules**:
    - `routes.ts**: Contains all API endpoints, AI tool definitions, and the Claude-powered agent loop.
    - `storage.ts**: Abstracted data access layer. Implements `DatabaseStorage`.
    - `db.ts**: Database connection and schema initialization.

### 3. AI Layer (Anthropic Claude)
- **Orchestrator**: The backend acts as an orchestrator, managing the conversation state and tool execution.
- **Tool-Use Phase**:
    1. User sends a message.
    2. Server prepares an enriched system prompt (including student profile and memories).
    3. Server calls Claude with tool definitions.
    4. If Claude calls a tool, the server executes it (e.g., `webSearch`) and feeds the result back to Claude.
    5. Final response is streamed to the client via SSE (Server-Sent Events).

## Data Schema (Highlights)
- **Profiles**: Stores student identity and unstructured "memories".
- **Learning Plans**: Hierarchical plans containing multiple Topics.
- **Challenges**: Coding problems with starter code, solutions, and internal test cases.
- **Progress**: Tracks student attempts, scores, and feedback for each challenge.

## Communication Flow
1. **Chat**: Client ↔ Server (SSE) ↔ AI.
2. **IDE**: Client solves challenge → Client runs local tests → Client sends code to Server → Server evaluates via AI → Result saved & returned.
3. **Plans**: Conversation → Server calls AI to generate JSON structure → Server saves to DB → Client refreshes.

## Deployment
- Designed to run on **Replit Autoscale** or any modern Node.js environment.
- Requires PostgreSQL and an Anthropic API Key.
