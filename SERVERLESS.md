# Serverless Architecture - localStorage Only

## Overview

Tilper AI now uses a fully client-side architecture with localStorage for data persistence. The backend only handles AI chat functionality.

## Architecture

### Backend (Minimal)
- **Single Endpoint**: `/api/mentor/chat` - SSE streaming AI chat endpoint
- **No Database**: No PostgreSQL, no ORM, no database connections
- **No Authentication**: No sessions, no user management
- **AI Only**: Handles Gemini AI chat with web search tool

### Frontend (Data Storage)
- **localStorage Service**: `client/src/lib/storage.ts`
- **Stored Data**:
  - User profiles (name, age, experience, goals, memories)
  - Learning plans (topics, status, progress)
  - Challenges (AI-generated coding exercises)
  - User progress (scores, feedback, completion)
  - Conversations (chat history)
  - Messages (all chat messages)

## Data Flow

```
User → Browser → localStorage (read/write)
User → Browser → /api/mentor/chat → Gemini AI → Stream Response
```

## Deployment

### Vercel
```bash
vercel deploy
```

Set environment variable:
- `GEMINI_API_KEY`: Your Google Gemini API key

### Netlify
```bash
netlify deploy --prod
```

Set environment variable:
- `GEMINI_API_KEY`: Your Google Gemini API key

### Other Platforms
The app works on any platform that supports:
1. Node.js serverless functions
2. Static file hosting

## Environment Variables

Only one environment variable is needed:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run start
```

## Key Files

- `server/app.ts` - Express app setup (no database)
- `server/routes.ts` - Single AI chat endpoint
- `client/src/lib/storage.ts` - localStorage service
- `client/src/pages/dashboard.tsx` - Main chat interface
- `client/src/components/app-sidebar.tsx` - Navigation using localStorage
- `api/index.ts` - Vercel serverless handler
- `netlify/functions/api.ts` - Netlify serverless handler

## Benefits

1. **No Database Configuration**: No connection strings, no migrations, no schema management
2. **No Connection Pool Issues**: No cold start problems, no connection limits
3. **Instant Deployment**: Deploy to any serverless platform in seconds
4. **Zero Cost Storage**: All data stored in user's browser
5. **Privacy**: User data never leaves their browser except for AI chat
6. **Simplicity**: Minimal backend, maximum portability

## Limitations

1. **Browser Storage Limits**: localStorage has ~5-10MB limit (sufficient for chat history)
2. **No Cross-Device Sync**: Data stored per browser, not synced across devices
3. **No Backup**: Data lost if browser cache is cleared (user responsibility)
4. **No Multi-User**: Each browser session is independent

## Future Enhancements (Optional)

If you want to add persistence back later, consider:
- Add optional cloud storage (Firebase, Supabase, etc.)
- Add export/import functionality for user data
- Add browser IndexedDB for larger storage capacity
