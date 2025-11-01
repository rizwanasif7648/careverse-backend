# 🚀 Quick Start Guide

## Prerequisites

Before running the project, make sure you have:

1. **Node.js 18+** installed
2. **PostgreSQL 14+** installed and running
3. **OpenAI API Key** (optional for now, but required for AI features)

## Setup Steps

### 1. Install PostgreSQL (if not installed)

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

### 2. Create Database

```bash
createdb careverse_db
```

Or using psql:
```bash
psql postgres
CREATE DATABASE careverse_db;
\q
```

### 3. Configure Environment Variables

The `.env` file has been created with default values. Update these if needed:

```bash
# Edit .env file
# Add your OpenAI API key (optional for now):
OPENAI_API_KEY=sk-your-key-here
```

### 4. Start the Server

```bash
npm run dev
```

The server will start on **http://localhost:5000**

### 5. Test the API

**Health Check:**
```bash
curl http://localhost:5000/health
```

**Register a User:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the `token` from the response for authenticated requests.

**Send Chat Message:**
```bash
curl -X POST http://localhost:5000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "message": "I have been having frequent headaches lately"
  }'
```

## Using Docker (Alternative)

If you prefer using Docker:

```bash
# Start all services (PostgreSQL, Redis, API)
docker-compose up

# Stop services
docker-compose down
```

## Project Structure

```
careverse_backend/
├── src/
│   ├── config/              # Configuration (database, logger, etc.)
│   ├── controllers/         # Route handlers
│   ├── middleware/          # Express middleware (auth, validation)
│   ├── models/              # Sequelize models (User, Conversation, etc.)
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   │   └── ai/              # AI services (to be implemented)
│   ├── utils/               # Utility functions
│   ├── app.js               # Express app setup
│   └── server.js            # Server entry point
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh-token` - Refresh token

### Chat (Requires Authentication)
- `POST /api/v1/chat/message` - Send message
- `GET /api/v1/chat/conversations` - Get all conversations
- `GET /api/v1/chat/conversations/:id` - Get conversation
- `GET /api/v1/chat/conversations/:id/messages` - Get messages
- `DELETE /api/v1/chat/conversations/:id` - Delete conversation

### Assessments (Requires Authentication)
- `GET /api/v1/assessments` - Get user assessments
- `GET /api/v1/assessments/:id` - Get assessment
- `POST /api/v1/assessments/generate` - Generate assessment

### Providers (Requires Authentication)
- `GET /api/v1/providers/search` - Search providers
- `GET /api/v1/providers/:id` - Get provider

## Next Steps

1. ✅ Basic project setup complete
2. ⏳ Implement AI service with LangChain.js
3. ⏳ Set up Pinecone vector database
4. ⏳ Create multi-agent system
5. ⏳ Add WebSocket for real-time chat
6. ⏳ Seed provider data

## Troubleshooting

**Database connection error:**
- Make sure PostgreSQL is running: `brew services list`
- Check database exists: `psql -l`
- Verify credentials in `.env`

**Port already in use:**
- Change `PORT` in `.env` file

**Dependencies issues:**
- Delete `node_modules` and run `npm install` again

## Need Help?

Check the main README.md for detailed documentation.
