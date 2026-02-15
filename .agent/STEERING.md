# Agent Steering Document: Tilper AI

This document provides guidance for AI agents working on the Tilper AI codebase. Following these patterns ensures consistency and maintains the project's educational goals.

## Project Vision
Tilper AI is an **educational mentor** designed specifically for **teenage developers** learning programming (JavaScript and Python). It features a "Chat-First" interface (Claude-style) that transitions into hands-on learning via integrated IDE challenges, structured learning plans, and real-time concept visualizations.

## Core Behavioral Principles for Agents
1. **Proactivity**: Don't wait for the student to ask for a challenge. If a topic is discussed, suggest a hands-on exercise using the `generate_challenge` tool.
2. **Educational Tone**: Be encouraging, use clear analogies, and favor a "Mentor" persona.
3. **"Code-First"**: The ultimate goal is to get the student writing code. Proactively switch from chat to code when appropriate.
4. **Context Awareness**: Use the `remember_about_student` tool to save personal details (goals, struggles, interests) to personalize future sessions.
5. **Animation over Explanation**: If a concept is complex (like Data Structures), use the animation tools/components to visualize it.

## Technical Standards

### AI Orchestration (The "Brain")
- **Models**:
    - `claude-sonnet-4-5`: Primary model for chat, challenge generation, and complex reasoning.
    - `claude-haiku-4-5`: Used for faster evaluations and animation step generation.
- **Agentic Loop**: Implemented in `server/routes.ts`. Supports up to 5 tool rounds.
- **Tools**: `web_search` (DuckDuckGo), `generate_challenge`, `generate_learning_plan`, and `remember_about_student`.

### Execution Environment
- **JavaScript**: Executed client-side via the `Function` constructor.
- **Python**: Executed client-side via **Pyodide** (WebAssembly).
- **Evaluation**: AI-assisted scoring (0-100) based on test results (70%) and code quality (30%).

### Engineering Patterns
- **Database**: Drizzle ORM (PostgreSQL). Always use the `storage` interface in `server/storage.ts`.
- **UI System**: Premium Glassmorphism. React + Vite + Tailwind + Radix UI + Framer Motion.
- **State**: Centralized `AppContext` in `client/src/lib/app-context.tsx` for core state (mode, active challenge, etc.).
- **Data Fetching**: TanStack Query (React Query).

## Key Development Patterns
- **Adding a new tool**: 
    1. Define in `MENTOR_TOOLS` (server/routes.ts).
    2. Handle in `handleToolCall`.
    3. Update system prompt instructions.
- **UI Consistency**: Use the primary accent color `#d97757` and maintain the Claude.ai-style aesthetics (centered inputs, action pills).

## Guardrails
- **Teen Safety**: Ensure all AI responses and challenges are age-appropriate.
- **Performance**: Minimize tool rounds where possible; ensure SSE streaming is smooth.
- **Session Management**: Use `x-session-id` header for all requests to ensure continuity.
