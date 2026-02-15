# Tilper AI - Interactive Coding Platform

## Overview
An educational technology platform for teenage developers to learn coding through interactive problem-solving with an AI mentor powered by Claude Sonnet API. Features a Claude.ai-style chat-first interface with centered greeting + input + action pills, Plan/Learn modes, personalized profiles, dynamic AI-generated challenges, browser-based code execution (JS + Python via Pyodide), animated concept visualizations, and progress tracking.

## Architecture
- **Frontend**: React + Vite, TailwindCSS, Shadcn UI, CodeMirror editor, wouter routing
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **AI**: Anthropic Claude via Replit AI Integrations (claude-sonnet-4-5 for chat/generation, claude-haiku-4-5 for animations/evaluation)
- **Code Execution**: Client-side (JavaScript via Function constructor, Python via Pyodide WebAssembly)
- **AI Agent Tools**: web_search (DuckDuckGo), generate_challenge, generate_learning_plan, remember_about_student (max 5 tool rounds)

## Key Pages
- `/` - Chat-first dashboard (Claude.ai style)
  - **Landing**: Centered greeting ("Afternoon, {name}"), chat input, action pills (Plan, Learn, Code, Explain, Review)
  - **Chat view**: Full-width chat messages in main area, input at bottom
  - **Plan mode**: AI learns about user, can generate learning plans from conversation
  - **Learn mode**: AI helps with coding concepts, challenges, debugging
- `/ide?challenge=<id>` - IDE page with split-pane layout (lesson/visual/mentor tabs on left, code editor on right)
- `/settings` - Full settings page with profile, AI memories, learning plans overview

## Layout
- Sidebar (left): Tilper AI logo, "New chat" button, Learning Plans, Recent challenges, Settings + theme toggle at bottom
- Main content (center): Chat-first interface (greeting + input + pills when empty, chat messages when active)
- No persistent right panel - chat IS the main content

## Key Components
- `client/src/components/chat-input.tsx` - Reusable chat input with auto-grow textarea, file upload, mode badges (Plan/Learn), landing/inline variants
- `client/src/components/mentor-chat.tsx` - Reusable AI mentor chat component for IDE contextual help, uses streaming SSE
- `client/src/components/animation-viewer.tsx` - Canvas-based concept visualizations with 12+ diagram types (tree, stack, queue, linked list, sorting, hashmap, array, loop, graph, function, conditional, variables)
- `client/src/components/code-editor.tsx` - CodeMirror editor with run/submit/reset controls
- `client/src/components/challenge-panel.tsx` - Challenge detail display

## API Routes
- `GET /api/profile` - Get user profile
- `POST /api/profile` - Create/update user profile
- `POST /api/profile/memories` - Add an AI memory
- `GET /api/plans` - Get learning plans
- `GET /api/plans/:id` - Get single plan
- `POST /api/plans/generate` - AI-generate a learning plan from conversation summary
- `PATCH /api/plans/:id` - Update plan (topics, status)
- `GET /api/challenges` - List challenges for session
- `GET /api/challenges/:id` - Get single challenge
- `POST /api/challenges/generate` - AI-generate a challenge (topic, difficulty, language, optional planId)
- `GET /api/progress` - Get user progress
- `GET /api/progress/:challengeId` - Get progress for specific challenge
- `POST /api/progress/save` - Save code progress
- `POST /api/submissions/evaluate` - AI-evaluate code submission (returns score, feedback, strengths, improvements)
- `POST /api/mentor/chat` - AI mentor chat (SSE streaming with tool-use: web_search, generate_challenge, generate_learning_plan, remember_about_student)
- `POST /api/animations/generate` - Generate animation steps via AI

## Database Schema
- `users` - User accounts (varchar id with UUID)
- `user_profiles` - Profile with name, age, experience, goals, preferredLanguage, memories (jsonb string[])
- `learning_plans` - AI-generated plans with topics array (jsonb), status
- `challenges` - Coding challenges with test cases, hints, starter code, language, planId
- `user_progress` - Tracks session-based progress per challenge with score, aiFeedback

## Theme
- Primary/accent color: #d97757 (HSL 15 63% 60%)
- Deep dark bg: #141516
- Dark mode bg: #262624
- Light mode bg: #f5f7f7
- Fonts: Space Grotesk (UI), JetBrains Mono (code)
- Dark mode default, toggle available

## Session Management
- Session ID stored in localStorage (`codequest-session-id`), sent via `x-session-id` header
- No authentication required for MVP

## App Context (client/src/lib/app-context.tsx)
- Manages: mode (plan/learn), chatMessages, activePlanId, activeChallengeId, isInChat
- Wraps entire app for cross-component state sharing

## Recent Changes
- Feb 15, 2026: Added Mentor tab to IDE page with contextual chat, upgraded animation system with 12+ diagram types (tree, stack, queue, linked list, sorting, hashmap, graph, conditional, function, variables)
- Feb 15, 2026: Added agentic AI with tool-use (web search, challenge generation, learning plan creation, memory saving), modular ChatInput with file upload and mode badges
- Feb 15, 2026: Redesigned to Claude.ai-style chat-first interface, renamed Build to Learn, removed right chat panel, added action pills, full settings page
- Feb 15, 2026: Added Plan/Build modes, persistent AI chat panel, user profiles with memories, learning plans, profile page
- Feb 15, 2026: Initial MVP build - dynamic AI challenge generation, Pyodide Python support, client-side code execution, AI scoring
