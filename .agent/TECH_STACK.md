# Tech Stack Reference

A summary of the technologies powering Tilper AI.

## Core Runtime
- **Node.js**: Backend execution environment (v20+).
- **TypeScript**: Used across the entire stack for type safety and better developer experience.

## Frontend
- **React**: Component-based UI library.
- **Vite**: Fast build tool and development server.
- **Wouter**: Minimalist routing.
- **TanStack Query**: Data fetching, caching, and synchronization.
- **Tailwind CSS**: Utility-first CSS framework.
- **Radix UI**: Unstyled, accessible UI primitives (Accordion, Dialog, Tabs, etc.).
- **Framer Motion**: Animation library for premium transitions.
- **Lucide React**: Icon set.
- **CodeMirror**: Powering the integrated IDE editor.

## Backend
- **Express**: Web framework for the API.
- **Drizzle ORM**: Type-safe ORM for database interactions.
- **PostgreSQL**: Relational database for persistence.
- **Zod**: Schema declaration and validation library.
- **Passport.js**: Authentication middleware (configured for local sessions).

## AI & Integrations
- **Anthropic SDK**: Interface for Claude 3.5 Sonnet and Haiku.
- **DuckDuckGo API**: Used for the `web_search` tool implementation.
- **Replit Integrations**: Specialized hooks for the Replit environment (optional).

## Tooling
- **tsx**: To run TypeScript files directly in development.
- **ESBuild**: Used for deployment builds.
- **PostCSS / Autoprefixer**: CSS processing.
