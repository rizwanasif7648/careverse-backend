# Careverse Backend

AI-powered healthcare platform backend built with Node.js, Express, and Sequelize.

## Features

- 🤖 **AI-Powered Assessment Generation**: Multi-agent system for comprehensive health assessments
- 👥 **User Authentication**: Secure JWT-based authentication
- 💬 **Real-time Chat**: Conversational symptom collection
- 📊 **Dynamic Assessments**: Severity-based triage (routine/urgent/emergency)
- 🏥 **Provider Matching**: Location-based healthcare provider recommendations with dynamic booking URLs
- 💊 **Product Recommendations**: Location-aware product suggestions with dynamic purchase links
- 🌍 **Global Location Awareness**: Intelligent web search discovers region-appropriate platforms (Zocdoc for US, Marham.pk for Pakistan, Practo for India, etc.)
- 🔍 **RAG-Enhanced Analysis**: Pinecone vector database for medical knowledge
- ⚡ **Performance Optimized**: Redis caching, parallel agent execution, token optimization
- 📝 **Medical Safety**: Comprehensive disclaimers and red flag detection

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
- Serper API Key (for location-aware URL discovery)
- Brave Search API Key (optional, for fallback)

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

## Web Search API Setup

The system uses web search APIs to dynamically discover location-appropriate booking platforms and e-commerce sites. This enables global applicability without hardcoded platform lists.

### Serper API (Required)

Serper is the primary search API used for discovering provider booking links and product purchase URLs.

**Getting Your API Key:**

1. Visit [https://serper.dev/](https://serper.dev/)
2. Sign up for a free account (includes 2,500 free searches)
3. Navigate to your dashboard
4. Copy your API key
5. Add to `.env`:
   ```bash
   SERPER_API_KEY=your_serper_api_key_here
   ```

**Pricing:**
- Free tier: 2,500 searches/month
- Pay-as-you-go: $5 per 1,000 searches
- Typical usage: ~2-4 searches per assessment (provider + product lookups)

### Brave Search API (Optional Fallback)

Brave Search serves as a fallback when Serper API fails or is unavailable.

**Getting Your API Key:**

1. Visit [https://brave.com/search/api/](https://brave.com/search/api/)
2. Sign up for the Brave Search API
3. Choose a plan (free tier available)
4. Copy your API key
5. Add to `.env`:
   ```bash
   BRAVE_SEARCH_API_KEY=your_brave_api_key_here
   ```

**Pricing:**
- Free tier: 2,000 queries/month
- Pro: $5/month for 15,000 queries
- Ultra: $15/month for 50,000 queries

**Note:** Brave Search is optional. If not configured, the system will fall back to provider websites or generic search URLs when Serper fails.

### Configuration Options

Customize web search behavior in `.env`:

```bash
# Timeout for search API calls (milliseconds)
WEB_SEARCH_TIMEOUT_MS=10000

# Maximum retry attempts for failed searches
WEB_SEARCH_MAX_RETRIES=2

# Enable/disable Redis caching for search results
WEB_SEARCH_CACHE_ENABLED=true

# Cache TTL for search results (hours)
WEB_SEARCH_CACHE_TTL_HOURS=6

# Maximum number of search results to return
WEB_SEARCH_MAX_RESULTS=5
```

### Troubleshooting

**Issue: "Web search failed" errors in logs**
- **Cause**: Missing or invalid Serper API key
- **Solution**: Verify `SERPER_API_KEY` is set correctly in `.env`
- **Check**: Test your API key at [https://serper.dev/playground](https://serper.dev/playground)

**Issue: High API costs**
- **Cause**: Cache disabled or low TTL
- **Solution**: Enable caching with `WEB_SEARCH_CACHE_ENABLED=true`
- **Optimization**: Increase `WEB_SEARCH_CACHE_TTL_HOURS` to reduce API calls

**Issue: Slow assessment generation**
- **Cause**: Web search timeout too high
- **Solution**: Reduce `WEB_SEARCH_TIMEOUT_MS` (recommended: 5000-10000ms)
- **Note**: Lower timeout may reduce URL discovery success rate

**Issue: No booking/purchase URLs in responses**
- **Cause**: Both Serper and Brave APIs failing
- **Solution**: Check API keys and account limits
- **Fallback**: System will use provider websites or generic URLs

**Issue: Wrong region URLs (e.g., US URLs for Pakistan users)**
- **Cause**: User location not set in profile
- **Solution**: Ensure user profile includes country, city, and coordinates
- **Verification**: Check user location data in database

### Testing Web Search

Test the web search tool independently:

```bash
# Test web search with sample query
node test-web-search-tool.js

# Test provider matcher with locations
node test-provider-matcher-locations.js

# Test product recommender with locations
node test-product-recommender-locations.js
```

### Monitoring

Monitor web search performance in logs:

```
[WebSearchTool] Search completed: query="book appointment Dr. Smith cardiology NYC USA", 
  engine=serper, time=456ms, results=5, cached=false
```

Key metrics to track:
- **Execution time**: Should be < 1 second per search
- **Cache hit rate**: Should be > 60% with proper caching
- **Success rate**: Should be > 95% with fallback configured
- **API usage**: Monitor monthly search counts to manage costs

## Environment Variables

See `.env.example` for all required environment variables:

- `DB_*`: PostgreSQL connection details
- `JWT_SECRET`: Secret key for JWT tokens
- `OPENAI_API_KEY`: OpenAI API key
- `PINECONE_API_KEY`: Pinecone vector database key
- `SERPER_API_KEY`: Serper API key for web search (required)
- `BRAVE_SEARCH_API_KEY`: Brave Search API key (optional fallback)
- `GOOGLE_PLACES_API_KEY`: Google Places API for provider search
- `WEB_SEARCH_*`: Web search tool configuration options

## API Endpoints

For complete API documentation with request/response schemas, examples, and error codes, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

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
- `POST /api/v1/assessments/generate` - Generate AI-powered assessment (requires auth)
- `GET /api/v1/assessments/:id` - Get assessment by ID (requires auth)

### Providers
- `GET /api/v1/providers/search` - Search providers (requires auth)
- `GET /api/v1/providers/:id` - Get provider details (requires auth)

## 🧪 Testing the Assessment Feature

### Quick Start (Choose One):

#### 1. **Bash Script** (Fastest - 10 seconds)
```bash
./quick-test.sh
```

#### 2. **Node.js Script** (Most Detailed)
```bash
# Test migraine scenario
node test-assessment-simple.js

# Test emergency scenario
node test-assessment-simple.js emergency

# Test allergic reaction
node test-assessment-simple.js allergic
```

#### 3. **Postman** (Most Interactive)
- Import `postman_collection.json`
- See [POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md) for setup

#### 4. **Automated Tests** (Most Comprehensive)
```bash
npm test -- --testPathPattern=assessment.test.js
```

### 📚 Testing Documentation
- **Quick Start**: [TESTING_QUICK_START.md](./TESTING_QUICK_START.md) - Choose your testing method
- **Manual Testing**: [MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md) - Detailed guide with all scenarios
- **Postman Guide**: [POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md) - Interactive API testing
- **Test Suite**: [src/tests/README.md](./src/tests/README.md) - Automated E2E tests

### What You'll Test
- ✅ Symptom extraction from conversations
- ✅ Medical condition analysis with RAG
- ✅ Severity classification (routine/urgent/emergency)
- ✅ Healthcare provider recommendations
- ✅ OTC product suggestions
- ✅ Next steps generation
- ✅ Error handling and edge cases

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
