# Tilper AI Slide Deck Material

This document contains the material for a 3-page slide deck presenting Tilper AI, along with instructions on how to generate a video presentation of these slides using the codebase.

## Slide 1: Introduction

**Title:** Tilper AI
**Subtitle:** Your Personal AI Coding Mentor

**Visuals:**
- Icon: Robot/AI Assistant
- Clean, modern layout with orange accents (Brand color)

**Key Points:**
- **What is it?** An interactive coding education platform for teenage developers, powered by Claude Sonnet 4.5.
- **24/7 Patient AI Tutor:** Always available to guide and explain.
- **Interactive Browser IDE:** Write and run code directly in the browser.
- **Visual Learning Animations:** Manim-inspired visualizations for complex concepts.
- **Personalized Roadmaps:** Adaptive learning paths based on skill level.

## Slide 2: Architecture & Technology

**Title:** Architecture & Tech
**Subtitle:** Modern Full-Stack Implementation

**Visuals:**
- Diagram showing flow between Frontend, Backend, and AI Engine.
- Icons representing technologies.

**Key Components:**
- **Frontend:**
    - React 18 + Vite (Fast development)
    - TailwindCSS + Shadcn UI (Beautiful styling)
    - Framer Motion (Smooth interactions)
- **Backend:**
    - Express.js + Node.js (Robust API)
    - Drizzle ORM + PostgreSQL (Type-safe database)
- **AI Engine:**
    - Anthropic Claude API (Sonnet 4.5 for reasoning)
    - Streaming SSE (Real-time chat experience)
    - Agentic Tools (Web search, memory, challenge generation)

## Slide 3: User Journey & Roadmap

**Title:** User Journey & Roadmap
**Subtitle:** From Beginner to Pro

**Visuals:**
- Step-by-step process flow.
- Roadmap timeline.

**User Journey Steps:**
1.  **Plan:** AI assesses current skills and creates a custom learning roadmap.
2.  **Learn:** Engage with interactive lessons and visual animations.
3.  **Code:** Practice solving challenges in the IDE with real-time feedback.

**Future Features:**
- **Video Export:** Integration with Remotion for generating educational videos.
- **Multiplayer Challenges:** Competitive coding with friends.
- **Mobile App:** React Native application for learning on the go.

---

## How to Generate These Slides

This repository includes a programmatic slide generator using **Remotion**. You can generate a video presentation of these slides by following the steps below.

### Prerequisites

- Node.js (v18+)
- npm or pnpm

### Generation Steps

1.  **Install Dependencies** (if not already done):
    ```bash
    npm install
    ```

2.  **Run the Generation Script**:
    We have included a script to bundle and render the slides to an MP4 video.
    ```bash
    npm run generate:slides
    ```

    *Alternatively, you can run the typescript file directly:*
    ```bash
    npx tsx slides/render.ts
    ```

3.  **View the Result**:
    The generated video will be saved to:
    ```
    out/slides.mp4
    ```

### Implementation Details

The slide generation logic is located in the `slides/` directory:
- `slides/Root.tsx`: The Remotion composition entry point.
- `slides/SlideDeck.tsx`: The React component defining the visual layout and animation of the slides using TailwindCSS.
- `slides/render.ts`: The build script that uses `@remotion/bundler` and `@remotion/renderer` to produce the video file.
