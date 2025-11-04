# CareVerse Backend

AI-powered healthcare platform with intelligent conversation management using LangChain + Pinecone vector embeddings.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys (OpenAI, Pinecone)

# 3. Setup database
npm run db:create
npm run db:migrate
npm run db:seed

# 4. Start server
npm run dev
```

Server runs on: **http://localhost:3000**

## ✨ Features

- 🤖 **AI-Powered Chat** - Intelligent health conversations with GPT
- 🧠 **Vector Embeddings** - Automatic conversation summarization after 50 messages
- 🔍 **Semantic Search** - Find relevant past conversations using AI
- 👥 **User Management** - JWT authentication
- 🏥 **Provider Directory** - Healthcare provider search
- 📊 **Health Assessments** - AI-generated health assessments
- 💾 **Smart Context** - Automatic context management (DB < 50 msgs, Vector DB ≥ 50 msgs)

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL + Sequelize ORM
- **Vector DB**: Pinecone
- **AI/LLM**: OpenAI (GPT-3.5/4) + LangChain
- **Auth**: JWT
- **Cache**: Redis (optional)

## 📋 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- OpenAI API Key
- Pinecone API Key

## 🔧 Environment Setup

Required environment variables in `.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=careverse_db
DB_USER=your_user
DB_PASSWORD=your_password

# OpenAI
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-3.5-turbo

# Pinecone
PINECONE_API_KEY=your-key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=careverse-medical-knowledge

# JWT
JWT_SECRET=your-secret-key
```

## 📡 API Endpoints

### Chat (Main API)
```bash
POST /api/v1/chat
Body: { userId, conversationId, message }
# Automatically creates embeddings after 50 messages
```

### Embeddings (Advanced)
```bash
GET  /api/v1/embeddings/context/:conversationId
POST /api/v1/embeddings/search
GET  /api/v1/embeddings/user/:userId/stats
```

### Authentication
```bash
POST /api/v1/auth/register
POST /api/v1/auth/login
```

### Providers
```bash
GET /api/v1/providers
GET /api/v1/providers/:id
```

## 🗄 Database

### Setup Commands
```bash
npm run db:create        # Create database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed data
npm run db:migrate:status # Check migration status
```

### Tables
- `users` - User accounts
- `conversations` - Chat sessions
- `messages` - Chat messages
- `assessments` - Health assessments
- `providers` - Healthcare providers
- `embeddings` - Vector embedding metadata

## 🧠 How Embeddings Work

### Automatic Process
1. User sends message → Saved to PostgreSQL
2. System checks message count
3. **If count ≥ 50 messages:**
   - Generates AI summary
   - Creates embedding vector (1536 dimensions)
   - Stores in Pinecone
   - Saves metadata in PostgreSQL
4. Gets context (DB or vector search)
5. Generates AI response

### Context Strategy
- **< 50 messages**: Returns all messages from database
- **≥ 50 messages**: Returns recent messages + relevant embeddings from Pinecone

## 📁 Project Structure

```
careverse-backend/
├── src/
│   ├── config/              # Configuration
│   ├── models/              # Sequelize models
│   ├── routes/              # API routes
│   │   ├── chat.routes.js       # Main chat API (triggers embeddings)
│   │   ├── embedding.routes.js  # Embedding management
│   │   └── ...
│   ├── services/
│   │   └── embedding/       # Embedding services
│   │       ├── embedding.service.js    # Main service
│   │       ├── summary.service.js      # AI summarization
│   │       └── pineconeClient.js       # Vector DB client
│   ├── database/
│   │   ├── migrations/      # Database migrations
│   │   └── seeders/         # Seed data
│   ├── middleware/          # Express middleware
│   ├── app.js              # Express app
│   └── server.js           # Entry point
├── scripts/                # Utility scripts
├── examples/               # Usage examples
└── .env                    # Environment variables
```

## 🧪 Testing

```bash
# Test chat API
curl -X POST http://localhost:3000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"uuid","conversationId":"uuid","message":"Hello"}'

# Check embeddings
curl http://localhost:3000/api/v1/embeddings/pinecone/stats

# Run example script
node examples/embedding-usage.js
```

## 📚 Documentation

- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** - Database setup guide
- **[EMBEDDING_SETUP.md](./EMBEDDING_SETUP.md)** - Embedding configuration
- **[EMBEDDING_API_CURL_COMMANDS.md](./EMBEDDING_API_CURL_COMMANDS.md)** - API reference
- **[DEPLOYMENT_NOTES.md](./DEPLOYMENT_NOTES.md)** - Deployment guide

## 🔑 Key Features Explained

### 1. Automatic Embedding Generation
No manual API calls needed. Embeddings are created automatically when conversation reaches 50 messages.

### 2. Smart Context Retrieval
System automatically chooses the best context source:
- Short conversations: Fast database queries
- Long conversations: Semantic vector search

### 3. Cost Optimization
- Embeddings generated in batches of 50 messages
- Reduces API calls and costs
- Efficient context management

## 🚀 Deployment

```bash
# Production build
NODE_ENV=production npm start

# Run migrations
npm run db:migrate

# Check status
npm run db:check
```

## 📝 Scripts

```bash
npm run dev              # Development server
npm start                # Production server
npm run db:create        # Create database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed data
npm test                 # Run tests
npm run lint             # Lint code
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

ISC

## 🆘 Support

For issues or questions:
1. Check documentation files
2. Review example scripts
3. Check server logs
4. Verify environment variables

---

**Built with ❤️ for better healthcare**
