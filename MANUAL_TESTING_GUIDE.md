# Manual Testing Guide - AI Assessment Generation

This guide will help you manually test the AI Assessment Generation feature using different methods.

## Prerequisites

Before testing, ensure:
1. ✅ Server is running: `npm run dev`
2. ✅ Database is set up and migrated: `npm run db:migrate`
3. ✅ Redis is running
4. ✅ Environment variables are configured (`.env` file)

## Method 1: Using Postman (Recommended)

### Step 1: Import the Postman Collection
The project includes a Postman collection at `postman_collection.json`.

1. Open Postman
2. Click "Import" → Select `postman_collection.json`
3. The collection includes all necessary requests

### Step 2: Set Up Environment Variables in Postman
Create a Postman environment with these variables:
- `base_url`: `http://localhost:5000`
- `token`: (will be set automatically after login)

### Step 3: Test Flow

#### A. Register a User
```
POST {{base_url}}/api/v1/auth/register
Body:
{
  "email": "test@example.com",
  "password": "TestPassword123!",
  "firstName": "Test",
  "lastName": "User"
}
```

#### B. Login
```
POST {{base_url}}/api/v1/auth/login
Body:
{
  "email": "test@example.com",
  "password": "TestPassword123!"
}
```
Copy the `token` from the response.

#### C. Create a Conversation
```
POST {{base_url}}/api/v1/chat/conversations
Headers:
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "title": "Headache symptoms"
}
```
Save the `conversationId` from the response.

#### D. Add Messages to Conversation
```
POST {{base_url}}/api/v1/chat/conversations/:conversationId/messages
Headers:
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "content": "I've been having really bad headaches lately."
}
```

Add multiple messages to simulate a conversation:
```json
// Message 2
{
  "content": "The pain is usually on one side of my head, and it's throbbing. I also feel nauseous and sensitive to light."
}

// Message 3
{
  "content": "They happen about 2-3 times a week and last for several hours. They get worse when I'm stressed at work."
}
```

#### E. Generate Assessment
```
POST {{base_url}}/api/v1/assessments/generate
Headers:
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "conversationId": "YOUR_CONVERSATION_ID"
}
```

This will take 5-15 seconds. You'll receive a comprehensive assessment with:
- Possible condition
- Severity level
- Next steps
- Healthcare providers (if applicable)
- Product recommendations (if applicable)
- Medical disclaimer

#### F. Retrieve Assessment
```
GET {{base_url}}/api/v1/assessments/:assessmentId
Headers:
  Authorization: Bearer YOUR_TOKEN
```

#### G. List All Assessments
```
GET {{base_url}}/api/v1/assessments
Headers:
  Authorization: Bearer YOUR_TOKEN
```

## Method 2: Using cURL Commands

### Quick Test Script
```bash
#!/bin/bash

BASE_URL="http://localhost:5000/api/v1"

# 1. Register
echo "1. Registering user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User"
  }')
echo $REGISTER_RESPONSE

# 2. Login
echo -e "\n2. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }')
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
echo "Token: $TOKEN"

# 3. Create Conversation
echo -e "\n3. Creating conversation..."
CONV_RESPONSE=$(curl -s -X POST "$BASE_URL/chat/conversations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Headache symptoms"
  }')
CONV_ID=$(echo $CONV_RESPONSE | jq -r '.data.conversation.id')
echo "Conversation ID: $CONV_ID"

# 4. Add Messages
echo -e "\n4. Adding messages..."
curl -s -X POST "$BASE_URL/chat/conversations/$CONV_ID/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "content": "I have been having really bad headaches lately."
  }' | jq

curl -s -X POST "$BASE_URL/chat/conversations/$CONV_ID/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "content": "The pain is usually on one side of my head, and it is throbbing. I also feel nauseous and sensitive to light."
  }' | jq

curl -s -X POST "$BASE_URL/chat/conversations/$CONV_ID/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "content": "They happen about 2-3 times a week and last for several hours. They get worse when I am stressed at work."
  }' | jq

# 5. Generate Assessment
echo -e "\n5. Generating assessment (this may take 5-15 seconds)..."
ASSESSMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/assessments/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"conversationId\": \"$CONV_ID\"
  }")
echo $ASSESSMENT_RESPONSE | jq

ASSESSMENT_ID=$(echo $ASSESSMENT_RESPONSE | jq -r '.data.assessmentId')
echo -e "\nAssessment ID: $ASSESSMENT_ID"

# 6. Retrieve Assessment
echo -e "\n6. Retrieving assessment..."
curl -s -X GET "$BASE_URL/assessments/$ASSESSMENT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

Save this as `test-assessment.sh`, make it executable (`chmod +x test-assessment.sh`), and run it.

## Method 3: Using the Automated Test Suite

### Run All E2E Tests
```bash
npm test -- --testPathPattern=assessment.test.js
```

### Run Specific Test Suites
```bash
# Test successful generation only
npm test -- --testPathPattern=assessment.test.js -t "18.2"

# Test error scenarios only
npm test -- --testPathPattern=assessment.test.js -t "18.3"

# Test performance
npm test -- --testPathPattern=assessment.test.js -t "18.5"
```

## Method 4: Using a Custom Test Script

Create a file `test-assessment-manual.js`:

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';
let token = '';
let conversationId = '';

async function testAssessment() {
  try {
    // 1. Register/Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'TestPassword123!'
    });
    token = loginResponse.data.data.token;
    console.log('✅ Logged in successfully');

    // 2. Create Conversation
    console.log('\n2. Creating conversation...');
    const convResponse = await axios.post(
      `${BASE_URL}/chat/conversations`,
      { title: 'Test Headache' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    conversationId = convResponse.data.data.conversation.id;
    console.log(`✅ Conversation created: ${conversationId}`);

    // 3. Add Messages
    console.log('\n3. Adding messages...');
    const messages = [
      "I've been having really bad headaches lately.",
      "The pain is usually on one side of my head, and it's throbbing. I also feel nauseous and sensitive to light.",
      "They happen about 2-3 times a week and last for several hours. They get worse when I'm stressed at work."
    ];

    for (const content of messages) {
      await axios.post(
        `${BASE_URL}/chat/conversations/${conversationId}/messages`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(`✅ Added message: "${content.substring(0, 50)}..."`);
    }

    // 4. Generate Assessment
    console.log('\n4. Generating assessment (this may take 5-15 seconds)...');
    const startTime = Date.now();
    const assessmentResponse = await axios.post(
      `${BASE_URL}/assessments/generate`,
      { conversationId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const endTime = Date.now();
    
    console.log(`✅ Assessment generated in ${(endTime - startTime) / 1000}s`);
    console.log('\n📋 Assessment Details:');
    console.log(JSON.stringify(assessmentResponse.data.data, null, 2));

    // 5. Retrieve Assessment
    const assessmentId = assessmentResponse.data.data.assessmentId;
    console.log(`\n5. Retrieving assessment ${assessmentId}...`);
    const retrieveResponse = await axios.get(
      `${BASE_URL}/assessments/${assessmentId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Assessment retrieved successfully');

    // 6. List All Assessments
    console.log('\n6. Listing all assessments...');
    const listResponse = await axios.get(
      `${BASE_URL}/assessments`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`✅ Found ${listResponse.data.data.assessments.length} assessments`);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAssessment();
```

Run it with:
```bash
node test-assessment-manual.js
```

## Test Scenarios to Try

### Scenario 1: Routine Symptoms (Migraine)
Messages:
1. "I've been having really bad headaches lately."
2. "The pain is usually on one side of my head, and it's throbbing. I also feel nauseous and sensitive to light."
3. "They happen about 2-3 times a week and last for several hours."

**Expected**: Routine severity, migraine-related condition

### Scenario 2: Urgent Symptoms (Allergic Reaction)
Messages:
1. "I ate something and now I have hives all over my body."
2. "I have red, itchy welts on my arms, chest, and back. My throat feels a bit tight."
3. "I had shrimp at a restaurant about 30 minutes ago."

**Expected**: Urgent severity, allergic reaction warning

### Scenario 3: Emergency Symptoms (Chest Pain)
Messages:
1. "I'm having severe chest pain right now."
2. "It's a crushing pain in the center of my chest. I'm also sweating a lot and feel short of breath."
3. "The pain is radiating to my left arm."

**Expected**: Emergency severity, immediate medical attention required

### Scenario 4: Insufficient Data
Messages:
1. "Hello"

**Expected**: 400 error - insufficient conversation data

## Monitoring and Debugging

### Check Server Logs
Watch the server console for detailed logs:
```bash
npm run dev
```

Look for:
- `Assessment generation requested`
- `AssessmentOrchestrator: Starting assessment generation`
- Agent execution logs
- `Assessment saved successfully`

### Check Redis Cache
```bash
redis-cli
> KEYS assessment:*
> GET assessment:YOUR_CONVERSATION_ID
```

### Check Database
```bash
psql -d careverse_db
SELECT id, user_id, conversation_id, severity, urgency, created_at 
FROM assessments 
ORDER BY created_at DESC 
LIMIT 5;
```

### Monitor Performance
Check execution time in response:
```json
{
  "data": {
    "executionTimeMs": 8543,
    ...
  }
}
```

## Troubleshooting

### Issue: "Conversation not found"
- Verify the conversation ID is correct
- Ensure you're using the correct auth token
- Check that the conversation belongs to the authenticated user

### Issue: "Insufficient conversation data"
- Add at least 3 messages to the conversation
- Ensure messages contain symptom descriptions

### Issue: Timeout or slow response
- Check OpenAI API status
- Verify Pinecone connection
- Check Redis connection
- Review server logs for bottlenecks

### Issue: "Column 'createdAt' does not exist"
- Run database migrations: `npm run db:migrate`
- Check that models have `underscored: true` option

## Performance Benchmarks

Expected performance:
- **Simple assessment**: 5-8 seconds
- **Complex assessment with providers**: 8-12 seconds
- **Assessment with products**: 10-15 seconds
- **Concurrent requests**: Should handle 3+ simultaneous requests

## Next Steps

After manual testing:
1. Review the generated assessments for accuracy
2. Test edge cases (emergency, urgent, routine)
3. Verify provider and product recommendations
4. Check medical disclaimers are present
5. Test error handling scenarios
6. Monitor token usage and costs

## Additional Resources

- **API Documentation**: See `API_DOCUMENTATION.md`
- **Postman Guide**: See `POSTMAN_GUIDE.md`
- **Test Suite**: See `src/tests/README.md`
- **Architecture**: See `.kiro/specs/ai-assessment-generation/design.md`
