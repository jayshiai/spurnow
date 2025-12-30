# SpurMart AI Support Chat

A live chat widget with AI-powered customer support, built for the Spur founding engineer take-home assignment.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes (TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **LLM**: OpenAI API (GPT-4o-mini)
- **Validation**: Zod

## Features

- Real-time chat interface with AI responses
- Conversation persistence across sessions
- Contextual AI replies using conversation history
- "Agent is typing..." indicator
- Error handling with friendly messages
- Input validation (max 2000 characters)
- Session-based conversation tracking

## Architecture Overview

```
src/
├── app/
│   ├── api/
│   │   └── chat/
│   │       ├── message/
│   │       │   └── route.ts      # POST endpoint for sending messages
│   │       └── history/
│   │           └── route.ts      # GET endpoint for fetching history
│   ├── page.tsx                  # Main landing page
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/
│   └── ChatWidget.tsx            # Chat UI component
├── lib/
│   ├── prisma.ts                 # Prisma client singleton
│   └── llm-service.ts            # LLM integration service
└── generated/
    └── prisma/                   # Generated Prisma client
```

### Backend Layers

1. **API Routes** (`src/app/api/chat/*`)
   - Handle HTTP requests/responses
   - Input validation using Zod
   - Error handling and status codes

2. **Service Layer** (`src/lib/llm-service.ts`)
   - Encapsulates LLM API calls
   - Manages conversation history context
   - Handles API errors gracefully

3. **Data Layer** (`src/lib/prisma.ts`)
   - Prisma ORM for database operations
   - Singleton pattern for connection management

### Database Schema

```prisma
model Conversation {
  id        String   @id @default(cuid())
  sessionId String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  messages  Message[]
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation  @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender         Sender       # USER | AI
  text           String
  timestamp      DateTime     @default(now())
}
```

## Getting Started Locally

### Prerequisites

- Node.js 18+ installed
- PostgreSQL running locally (or use Supabase)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

#### Option A: Local PostgreSQL

```bash
# Create a database
createdb spurnow

# Copy environment template
cp .env.example .env

# Edit .env and set your DATABASE_URL
# DATABASE_URL="postgresql://user:password@localhost:5432/spurnow?schema=public"
```

#### Option B: Supabase (Recommended for easy setup)

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > Database > Connection String
4. Copy the connection string and add it to `.env`

### 3. Configure Environment Variables

Edit `.env` and add:

```env
# Database (use your connection string)
DATABASE_URL="postgresql://user:password@localhost:5432/spurnow?schema=public"

# OpenAI API Key (required)
# Get your key from: https://platform.openai.com/api-keys
OPENAI_API_KEY="sk-..."

# Optional: Model selection (defaults to gpt-4o-mini)
OPENAI_MODEL="gpt-4o-mini"
```

### 4. Run Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Create tables in database
npx prisma migrate dev --name init
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## LLM Integration

### Provider: OpenAI

- **Model**: GPT-4o-mini (cost-effective, fast)
- **Max Tokens**: 500 (keeps responses concise)
- **Temperature**: 0.7 (balanced creativity)
- **Context Window**: Last 10 messages for conversation history

### Prompt Strategy

The AI is configured with a system prompt containing:

- Role definition (helpful support agent for SpurMart)
- Store knowledge base (shipping, returns, support hours, payment)
- Guardrails for unknown questions
- Contact information fallback

### Error Handling

- **401 Unauthorized**: Invalid API key
- **429 Rate Limit**: Service busy message
- **5xx Errors**: Temporary unavailable message
- **Network Errors**: Generic retry message

### Cost Control

- Max 500 tokens per response (~$0.00015 per message with gpt-4o-mini)
- Last 10 messages only in context
- No streaming (simpler implementation)

## API Endpoints

### POST /api/chat/message

Send a message and get an AI response.

**Request Body:**
```json
{
  "message": "What's your return policy?",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "reply": "We accept returns within 30 days...",
  "sessionId": "session-id"
}
```

### GET /api/chat/history?sessionId=xxx

Fetch conversation history for a session.

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-123",
      "sender": "USER",
      "text": "Hello",
      "timestamp": "2025-12-30T10:00:00Z"
    }
  ],
  "sessionId": "session-id"
}
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL` (Supabase connection string)
   - `OPENAI_API_KEY`
4. Deploy

### Environment Variables for Production

Use Supabase for the database:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
OPENAI_API_KEY="sk-..."
```

After deployment, run the migration on your production database:

```bash
npx prisma migrate deploy
```

## Testing the Application

1. Open the chat widget (bottom-right corner)
2. Try these sample questions:
   - "What's your return policy?"
   - "Do you ship to the USA?"
   - "How long does shipping take?"
   - "What payment methods do you accept?"
   - "When is your support team available?"

## Design Decisions

1. **Prisma over Supabase Client**: Using Prisma ORM provides better type safety and easier migration to other databases if needed.

2. **Session-based conversations**: Using localStorage to persist session IDs allows conversations to continue across page reloads without authentication.

3. **Zod validation**: Input validation at the API layer prevents bad data from reaching the database or LLM.

4. **Optimistic UI updates**: User messages appear immediately, with rollback on error for better perceived performance.

5. **Singleton Prisma client**: Prevents connection pool exhaustion in development with hot reloading.

## Trade-offs & Future Improvements

### Current Limitations

- No user authentication (anonymous sessions only)
- No streaming responses (waits for full LLM response)
- Limited to last 10 messages in context
- No conversation analytics or admin panel
- No multi-language support

### If I Had More Time

1. **Add authentication**: Allow users to log in and access their conversation history across devices

2. **Streaming responses**: Use Server-Sent Events or WebSocket for real-time streaming of AI responses

3. **Rate limiting**: Add per-IP rate limiting to prevent abuse

4. **Admin dashboard**: View all conversations, analytics, and manual intervention capability

5. **Multi-channel support**: Architecture is designed to easily add WhatsApp, Instagram, or Facebook Messenger integrations

6. **Knowledge base in database**: Store FAQ content in database instead of hardcoding in prompt

7. **Caching**: Add Redis caching for common questions to reduce LLM API costs

8. **Sentiment analysis**: Track user sentiment and escalate to human support when needed

## License

MIT