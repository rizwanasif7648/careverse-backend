# Prerequisites Checklist for Assessment API

## ✅ What You Need Before Calling `/api/v1/assessments/generate`

### 1. **RESTART YOUR SERVER** (CRITICAL!)
The code fixes have been applied, but Node.js caches modules. You MUST restart:

```bash
# Stop your current server (Ctrl+C)
# Then restart:
npm run dev
```

---

### 2. **Environment Variables (.env file)**

#### Required (API will fail without these):
```env
# OpenAI - For AI analysis
OPENAI_API_KEY=sk-your-actual-openai-key-here

# Pinecone - For medical knowledge retrieval
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-pinecone-environment
PINECONE_INDEX_NAME=your-index-name

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=careverse_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT for authentication
JWT_SECRET=your-jwt-secret-key
```

#### Optional (System works without these, but with reduced features):
```env
# Google Places - For finding real healthcare providers
GOOGLE_PLACES_API_KEY=your-google-places-key

# Redis - For caching (improves performance)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # if you have one
```

---

### 3. **Database Setup**

#### Run migrations:
```bash
npm run db:migrate
```

This creates:
- Assessment table with all required fields
- Performance indexes
- Enhanced fields (warnings, metadata, etc.)

#### Verify tables exist:
```bash
psql -U your_db_user -d careverse_db -c "\dt"
```

You should see: `users`, `conversations`, `messages`, `assessments`, `providers`

---

### 4. **Valid Conversation Data**

Before generating an assessment, you need:

#### A. User Account
- Must be registered and authenticated
- Must have a valid JWT token

#### B. Conversation with Health Content
- Conversation must exist in database
- Must belong to the authenticated user
- Must have **at least 3 messages**
- Messages should contain **health-related content** (not just greetings)

#### Example Valid Conversation Flow:
```
User: "I've been having headaches for the past week"
AI: "I'm sorry to hear that. Can you tell me more about these headaches?"
User: "They happen mostly in the afternoon, on the right side of my head"
AI: "How severe would you say the pain is?"
User: "Pretty bad, maybe 7 out of 10. Sometimes I feel nauseous too"
```

#### Example Invalid Conversation (too short):
```
User: "Hi"
AI: "Hello! How can I help you today?"
```

---

### 5. **External Services Status**

#### Check Pinecone (Required):
1. Go to [pinecone.io](https://pinecone.io)
2. Verify your index exists
3. Index must have:
   - **Dimensions**: 1536 (for OpenAI embeddings)
   - **Metric**: cosine
   - Status: Active

#### Check Redis (Optional):
```bash
# Test if Redis is running
redis-cli ping
# Should return: PONG

# If not running, start it:
redis-server
# or
brew services start redis  # macOS
```

#### Check Google Places (Optional):
- Only needed if you want real provider search
- Without it, system still works but returns empty provider list

---

## 🔍 Quick Verification Script

Run this to check your setup:

```bash
#!/bin/bash
echo "🔍 Checking Assessment API Prerequisites..."
echo ""

# 1. Check environment variables
echo "1️⃣ Environment Variables:"
if [ -z "$OPENAI_API_KEY" ]; then
  echo "   ❌ OPENAI_API_KEY not set"
else
  echo "   ✅ OPENAI_API_KEY configured"
fi

if [ -z "$PINECONE_API_KEY" ]; then
  echo "   ❌ PINECONE_API_KEY not set"
else
  echo "   ✅ PINECONE_API_KEY configured"
fi

if [ -z "$GOOGLE_PLACES_API_KEY" ]; then
  echo "   ⚠️  GOOGLE_PLACES_API_KEY not set (optional)"
else
  echo "   ✅ GOOGLE_PLACES_API_KEY configured"
fi

# 2. Check Redis
echo ""
echo "2️⃣ Redis:"
if redis-cli ping > /dev/null 2>&1; then
  echo "   ✅ Redis is running"
else
  echo "   ⚠️  Redis not running (optional but recommended)"
fi

# 3. Check database
echo ""
echo "3️⃣ Database:"
if psql -U $DB_USER -d $DB_NAME -c "SELECT 1 FROM assessments LIMIT 1;" > /dev/null 2>&1; then
  echo "   ✅ Database and assessments table exist"
else
  echo "   ❌ Database or assessments table missing - run migrations!"
fi

echo ""
echo "✅ Setup check complete!"
```

---

## 📋 Step-by-Step Testing Guide

### Step 1: Verify Server is Running
```bash
# Check server logs for:
# ✅ "Server running on port 5000"
# ✅ "Database connected successfully"
# ❌ No "Cannot find module" errors
```

### Step 2: Authenticate
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }'
```

Save the `token` from the response.

### Step 3: Create a Health Conversation
```bash
# Start conversation
curl -X POST http://localhost:5000/api/v1/chat/conversations/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I have been having severe headaches for the past week"
  }'
```

Save the `conversationId` from the response.

```bash
# Add more messages (need at least 3 total)
curl -X POST http://localhost:5000/api/v1/chat/conversations/CONVERSATION_ID/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "The headaches happen mostly in the afternoon on the right side"
  }'

curl -X POST http://localhost:5000/api/v1/chat/conversations/CONVERSATION_ID/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "The pain is about 7/10 and I sometimes feel nauseous"
  }'
```

### Step 4: Generate Assessment
```bash
curl -X POST http://localhost:5000/api/v1/assessments/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "YOUR_CONVERSATION_ID"
  }'
```

---

## 🚨 Common Errors & Solutions

### Error: "Cannot find module tokenCounter"
**Solution**: Restart your server (the fix has been applied)

### Error: "column distance_miles does not exist"
**Solution**: This is now fixed in the code. Restart your server.

### Error: "Pinecone service not ready"
**Solution**: 
- Add PINECONE_API_KEY to .env
- Verify your Pinecone index exists and is active
- Restart server

### Error: "Insufficient conversation data"
**Solution**: 
- Ensure conversation has at least 3 messages
- Messages should contain health-related content
- Not just greetings like "Hi" / "Hello"

### Error: "Conversation not found"
**Solution**: 
- Verify conversationId is correct
- Ensure conversation belongs to authenticated user
- Check conversation exists in database

### Warning: "Google Places API key not configured"
**This is OK!** The system works without it. You just won't get real provider results.

### Warning: "Redis not connected"
**This is OK!** The system works without it. It will just be slower (no caching).

---

## ✅ Minimum Working Configuration

To get the API working with minimal setup:

1. **Required Environment Variables**:
   - OPENAI_API_KEY
   - PINECONE_API_KEY
   - PINECONE_ENVIRONMENT
   - PINECONE_INDEX_NAME
   - Database credentials
   - JWT_SECRET

2. **Database**: Run migrations

3. **Conversation**: Create one with 3+ health messages

4. **Restart Server**: After applying fixes

That's it! Redis and Google Places are optional.

---

## 📊 Expected Successful Response

When everything works, you'll get:

```json
{
  "success": true,
  "data": {
    "assessmentId": "valid-uuid-here",
    "possibleCondition": {
      "name": "Migraine",
      "description": "...",
      "commonTriggers": [...],
      "initialSelfCare": [...]
    },
    "severity": "moderate",
    "confidence": "high",
    "nextSteps": [...],
    "providers": [],  // Empty if no Google Places key
    "products": [...],
    "disclaimer": "...",
    "executionTimeMs": 8500,
    "tokensUsed": 2500
  }
}
```

---

## 🎯 Your Current Issues (From Logs)

Based on your server logs, here's what's wrong:

1. ❌ **tokenCounter import path** - FIXED (restart server)
2. ❌ **distance_miles column** - FIXED (restart server)
3. ⚠️ **Pinecone not ready** - Check your PINECONE_API_KEY
4. ⚠️ **Google Places not configured** - Optional, ignore if you don't need it
5. ⚠️ **Redis not connected** - Optional, ignore if you don't need it

**Next Action**: Restart your server and try again!
