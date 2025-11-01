# Careverse Backend

AI-powered healthcare platform backend built with Node.js, Express, and Sequelize.

## Features

- 🤖 AI-powered health assessment chatbot
- 👥 User authentication (JWT)
- 💬 Real-time chat conversations
- 📊 Dynamic health assessments
- 🏥 Healthcare provider search
- 🔍 Location-based provider matching
- 📝 Medical history tracking

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **AI/LLM**: LangChain.js + OpenAI
- **Vector DB**: Pinecone (for RAG)
- **Cache**: Redis

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis (optional, for caching)
- OpenAI API Key
- Pinecone API Key

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd careverse_backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Set up PostgreSQL database**
```bash
createdb careverse_db
```

5. **Run database migrations** (optional, using sequelize-cli)
```bash
npm run db:migrate
```

6. **Start the development server**
```bash
npm run dev
```

The server will start on `http://localhost:5000`

## Environment Variables

See `.env.example` for all required environment variables:

- `DB_*`: PostgreSQL connection details
- `JWT_SECRET`: Secret key for JWT tokens
- `OPENAI_API_KEY`: OpenAI API key
- `PINECONE_API_KEY`: Pinecone vector database key

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh-token` - Refresh access token

### Chat
- `POST /api/v1/chat/message` - Send message (requires auth)
- `GET /api/v1/chat/conversations` - Get all conversations (requires auth)
- `GET /api/v1/chat/conversations/:id` - Get conversation (requires auth)
- `GET /api/v1/chat/conversations/:id/messages` - Get messages (requires auth)
- `DELETE /api/v1/chat/conversations/:id` - Delete conversation (requires auth)

### Assessments
- `GET /api/v1/assessments` - Get user assessments (requires auth)
- `GET /api/v1/assessments/:id` - Get assessment (requires auth)
- `POST /api/v1/assessments/generate` - Generate assessment (requires auth)

### Providers
- `GET /api/v1/providers/search` - Search providers (requires auth)
- `GET /api/v1/providers/:id` - Get provider details (requires auth)

## Project Structure

```
careverse_backend/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Express middleware
│   ├── models/           # Sequelize models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   │   └── ai/          # AI/LangChain services
│   ├── utils/           # Utility functions
│   ├── app.js           # Express app setup
│   └── server.js        # Server entry point
├── package.json
└── README.md
```

## Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm test` - Run tests
- `npm run lint` - Lint code

## Database Models

- **User** - User accounts and profiles
- **Conversation** - Chat conversations
- **Message** - Individual chat messages
- **Assessment** - Health assessments
- **Provider** - Healthcare providers

## Next Steps

1. Implement AI service with LangChain.js
2. Set up Pinecone vector database for RAG
3. Create multi-agent orchestration system
4. Add WebSocket support for real-time chat
5. Implement provider data seeding
6. Add comprehensive testing

## License

ISC
