# Tilper AI

> An interactive coding education platform for teenage developers, powered by Claude AI

Tilper AI is a modern, AI-powered learning platform that helps teenagers learn programming through interactive problem-solving, personalized mentorship, and beautiful visual animations. Think of it as having a patient coding tutor available 24/7.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue.svg)

## ✨ Features

### AI-Powered Learning
- **Intelligent Mentor**: Claude Sonnet 4.5 provides personalized guidance and explanations
- **Agentic Tools**: AI can search the web, generate challenges, create learning plans, and remember student details
- **Adaptive Difficulty**: Challenges adjust to student skill level
- **Real-time Feedback**: AI evaluates code submissions with detailed feedback

### Learning Modes
- **Plan Mode**: AI learns about you and creates personalized learning roadmaps
- **Learn Mode**: Interactive coding lessons with AI assistance
- **IDE Mode**: Full-featured coding environment with split-pane layout

### Visual Learning
- **Manim-Inspired Animations**: 3Blue1Brown-style educational visualizations
- **12+ Diagram Types**: Trees, stacks, queues, graphs, sorting algorithms, and more
- **Smooth Transitions**: Professional crossfade animations between concepts
- **Interactive Playback**: Play, pause, step forward/back through animations

### Code Execution
- **Browser-Based**: No server-side execution needed
- **JavaScript Support**: Run JS code instantly with Function constructor
- **Python Support**: Execute Python via Pyodide WebAssembly
- **Safe Sandbox**: All code runs client-side in isolated environment

### Challenge System
- **Dynamic Generation**: AI creates custom coding challenges on any topic
- **Multiple Languages**: JavaScript and Python support
- **Test Cases**: Automated testing with detailed results
- **Progress Tracking**: Save your work and track completion

### Personalization
- **User Profiles**: Name, age, experience level, goals
- **AI Memories**: System remembers your learning style and preferences
- **Learning Plans**: Structured roadmaps with 4-8 progressive topics
- **Session-Based**: No authentication required for MVP

### Modern UI/UX
- **Claude.ai-Style Interface**: Clean, chat-first design
- **Dark Mode**: Beautiful dark theme by default
- **Responsive**: Works on desktop and tablet
- **Smooth Animations**: Framer Motion for delightful interactions

## 🏗️ Architecture

### Frontend
- **React 18** + **Vite** - Fast, modern development
- **TypeScript** - Type-safe code
- **TailwindCSS** - Utility-first styling
- **Shadcn UI** - Beautiful, accessible components
- **CodeMirror** - Professional code editor
- **Wouter** - Lightweight routing
- **React Query** - Server state management

### Backend
- **Express.js** - Fast, minimal web framework
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** - Reliable data storage (optional)
- **In-Memory Storage** - Quick start without database

### AI Integration
- **Anthropic Claude API** - Powered by Claude Sonnet 4.5
- **Streaming Responses** - Real-time chat with Server-Sent Events
- **Tool Use**: Web search, challenge generation, plan creation, memory storage
- **Smart Routing**: Sonnet for reasoning, Haiku for structured output

### Animation System
- **HTML5 Canvas** - High-performance rendering
- **Timeline-Based** - Smooth, continuous animations
- **Remotion Ready** - Infrastructure for future video export
- **AI-Generated** - Claude creates animation sequences

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/tilper-ai.git
cd tilper-ai
```

2. **Install dependencies**
```bash
npm install
# or
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:
```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
PORT=5000
NODE_ENV=development
```

4. **Start the development server**
```bash
npm run dev
# or
pnpm dev
```

5. **Open your browser**
```
http://localhost:5000
```

That's it! 🎉

## 📖 Usage

### For Students

1. **Start Learning**: Open the app and you'll see a friendly greeting
2. **Choose a Mode**: 
   - Click "Plan" to create a personalized learning roadmap
   - Click "Learn" to start coding with AI guidance
3. **Pick a Challenge**: Browse challenges or ask AI to generate one
4. **Code & Learn**: Write code in the IDE, run tests, get feedback
5. **Watch Animations**: Click "Visual" tab to see concept visualizations

### For Educators

1. **Create Custom Challenges**: Use the AI to generate challenges on specific topics
2. **Track Progress**: Monitor student completion and scores
3. **Customize Learning Paths**: Create structured plans for different skill levels

## 🎯 Key Pages

### Dashboard (`/`)
- Chat-first interface inspired by Claude.ai
- Centered greeting with personalized message
- Action pills: Plan, Learn, Code, Explain, Review
- Sidebar with learning plans and recent challenges

### IDE (`/ide?challenge=<id>`)
- Split-pane layout
- Left panel: Lesson, Visual animations, Mentor chat
- Right panel: Code editor with syntax highlighting
- Run, submit, and reset controls
- Real-time test results

### Settings (`/settings`)
- User profile management
- AI memories overview
- Learning plans dashboard
- Theme toggle

## 🛠️ Development

### Project Structure
```
tilper-ai/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── lib/           # Utilities and context
│   │   └── hooks/         # Custom React hooks
├── server/                # Backend Express app
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   ├── prompts.ts        # AI prompt templates
│   ├── db.ts             # Database setup
│   └── storage.ts        # Data access layer
├── shared/               # Shared types and schemas
└── public/              # Static assets
```

### Available Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload

# Production
npm run build        # Build for production
npm start           # Start production server

# Database
npm run db:push     # Push schema changes to database

# Type Checking
npm run check       # Run TypeScript type checker
```

### API Routes

#### Profile
- `GET /api/profile` - Get user profile
- `POST /api/profile` - Create/update profile
- `POST /api/profile/memories` - Add AI memory

#### Learning Plans
- `GET /api/plans` - List all plans
- `GET /api/plans/:id` - Get single plan
- `POST /api/plans/generate` - AI-generate plan
- `PATCH /api/plans/:id` - Update plan

#### Challenges
- `GET /api/challenges` - List challenges
- `GET /api/challenges/:id` - Get challenge
- `POST /api/challenges/generate` - AI-generate challenge

#### Progress
- `GET /api/progress` - Get all progress
- `GET /api/progress/:challengeId` - Get challenge progress
- `POST /api/progress/save` - Save code progress

#### AI Features
- `POST /api/mentor/chat` - AI mentor chat (SSE streaming)
- `POST /api/submissions/evaluate` - AI code evaluation
- `POST /api/animations/generate` - Generate visual animations

## 🎨 Customization

### Theme Colors
Edit `tailwind.config.ts`:
```typescript
colors: {
  primary: '#d97757',  // Accent color
  // ... other colors
}
```

### AI Prompts
Customize AI behavior in `server/prompts.ts`:
- `buildSystemPrompt` - Main mentor personality
- `buildChallengeGenerationPrompt` - Challenge creation
- `buildAnimationPrompt` - Visual generation

### Animation Diagrams
Add new diagram types in `client/src/components/animation-viewer.tsx`:
```typescript
function drawCustomDiagram(ctx, w, h, progress, isDark) {
  // Your custom visualization
}
```

## 🗄️ Database Setup (Optional)

By default, Tilper AI uses in-memory storage. For persistence:

1. **Install PostgreSQL**
2. **Create database**
```sql
CREATE DATABASE tilper_ai;
```

3. **Add to `.env`**
```env
DATABASE_URL=postgresql://username:password@localhost:5432/tilper_ai
```

4. **Push schema**
```bash
npm run db:push
```

## 🔒 Security Notes

- API keys stored in `.env` (never commit!)
- Session IDs in localStorage (no sensitive data)
- Client-side code execution (sandboxed)
- No authentication required for MVP
- Rate limiting recommended for production

## 🚢 Deployment

### Recommended Platforms
- **Vercel** - Zero-config deployment
- **Railway** - Easy PostgreSQL setup
- **Render** - Free tier available
- **Replit** - Built-in hosting

### Environment Variables
Set these in your hosting platform:
- `ANTHROPIC_API_KEY` - Your Claude API key
- `DATABASE_URL` - PostgreSQL connection (optional)
- `NODE_ENV` - Set to `production`
- `PORT` - Usually auto-set by platform

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use Prettier for formatting
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Anthropic** - For the amazing Claude AI
- **3Blue1Brown** - Inspiration for animation system
- **Shadcn** - Beautiful UI components
- **Vercel** - React and Next.js ecosystem
- **The open-source community** - For incredible tools

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/tilper-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/tilper-ai/discussions)
- **Email**: support@tilper.ai

## 🗺️ Roadmap

- [ ] Video export for animations (Remotion integration)
- [ ] More programming languages (Java, C++, Rust)
- [ ] Multiplayer coding challenges
- [ ] Teacher dashboard
- [ ] Mobile app (React Native)
- [ ] Gamification (badges, leaderboards)
- [ ] Code review AI assistant
- [ ] Integration with GitHub

---

**Built with ❤️ for teenage developers learning to code**

*Tilper AI - Making coding education accessible, engaging, and fun!*
