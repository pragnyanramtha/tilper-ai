# CodeQuest - Interactive Coding Platform

## Overview
An educational technology platform for teenage developers to learn coding through interactive problem-solving with an AI mentor powered by Claude Sonnet API. Features a built-in code editor, adaptive AI mentoring, animated concept visualizations, and progress tracking.

## Architecture
- **Frontend**: React + Vite, TailwindCSS, Shadcn UI, CodeMirror editor
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **AI**: Anthropic Claude via Replit AI Integrations (claude-sonnet-4-5 for chat, claude-haiku-4-5 for animations)

## Key Pages
- `/` - Dashboard with challenge cards and progress overview
- `/ide?challenge=<id>` - IDE page with split-pane layout (lesson/visual/mentor tabs on left, code editor on right)

## API Routes
- `GET /api/challenges` - List all challenges
- `GET /api/challenges/:id` - Get single challenge
- `GET /api/progress` - Get user progress (session-based via x-session-id header)
- `GET /api/progress/:challengeId` - Get progress for specific challenge
- `POST /api/code/run` - Run code against tests
- `POST /api/code/submit` - Submit code (marks as completed if all tests pass)
- `POST /api/mentor/chat` - AI mentor chat (SSE streaming)
- `POST /api/animations/generate` - Generate animation steps via AI

## Database Schema
- `users` - User accounts (varchar id with UUID)
- `challenges` - Coding challenges with test cases, hints, starter code
- `user_progress` - Tracks session-based progress per challenge
- `conversations` / `messages` - Chat history (from integration)

## Theme
- Primary/accent color: #d97757 (HSL 15 63% 60%)
- Dark mode bg: #262624
- Light mode bg: #f5f7f7
- Fonts: IBM Plex Sans (UI), JetBrains Mono (code)
- Dark mode default, toggle available

## Session Management
- Session ID stored in localStorage, sent via x-session-id header
- No authentication required for MVP

## Recent Changes
- Feb 15, 2026: Initial MVP build with all core features
