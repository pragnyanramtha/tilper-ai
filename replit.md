# Tilper AI - Interactive Coding Platform

## Overview
An educational technology platform for teenage developers to learn coding through interactive problem-solving with an AI mentor powered by Claude Sonnet API. Features Plan/Build modes, persistent AI chat, personalized profiles, dynamic AI-generated challenges, browser-based code execution (JS + Python via Pyodide), animated concept visualizations, and progress tracking.

## Architecture
- **Frontend**: React + Vite, TailwindCSS, Shadcn UI, CodeMirror editor, wouter routing
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **AI**: Anthropic Claude via Replit AI Integrations (claude-sonnet-4-5 for chat/generation, claude-haiku-4-5 for animations/evaluation)
- **Code Execution**: Client-side (JavaScript via Function constructor, Python via Pyodide WebAssembly)

## Key Pages
- `/` - Dashboard with Plan/Build mode views
  - **Plan mode**: Chat-first view where AI learns about user, generates learning plans
  - **Build mode**: Shows learning plan topics, quick challenge generator, recent challenges
- `/ide?challenge=<id>` - IDE page with split-pane layout (lesson/visual tabs on left, code editor on right)
- `/profile` - Profile/settings page with name, age, experience, goals, preferred language, AI memories

## Layout
- Sidebar (left): Navigation, learning plans, recent challenges, theme toggle
- Main content (center): Route-based content
- Chat panel (right, persistent): AI mentor chat that adapts to Plan/Build mode
- Plan/Build mode toggle in header

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
- `POST /api/mentor/chat` - AI mentor chat (SSE streaming, enriched with profile context)
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
- Manages: mode (plan/build), chatMessages, activePlanId, activeChallengeId
- Wraps entire app for cross-component state sharing

## Recent Changes
- Feb 15, 2026: Added Plan/Build modes, persistent AI chat panel, user profiles with memories, learning plans, profile page
- Feb 15, 2026: Initial MVP build - dynamic AI challenge generation, Pyodide Python support, client-side code execution, AI scoring
