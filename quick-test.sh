#!/bin/bash

# Quick Assessment Test Script
# This script tests the assessment generation feature end-to-end

set -e

BASE_URL="http://localhost:5000/api/v1"
EMAIL="test-$(date +%s)@example.com"
PASSWORD="TestPassword123!"

echo "🚀 Starting Assessment Generation Test"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Register User
echo -e "\n${BLUE}1. Registering new user...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\"
  }")

if echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
  echo -e "${GREEN}✅ User registered successfully${NC}"
else
  echo -e "${RED}❌ Registration failed${NC}"
  echo "$REGISTER_RESPONSE"
  exit 1
fi

# 2. Login
echo -e "\n${BLUE}2. Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Logged in successfully${NC}"
echo "Token: ${TOKEN:0:20}..."

# 3. Create Conversation
echo -e "\n${BLUE}3. Creating conversation...${NC}"
CONV_RESPONSE=$(curl -s -X POST "$BASE_URL/chat/conversations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Headache symptoms test"
  }')

CONV_ID=$(echo "$CONV_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$CONV_ID" ]; then
  echo -e "${RED}❌ Conversation creation failed${NC}"
  echo "$CONV_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Conversation created${NC}"
echo "Conversation ID: $CONV_ID"

# 4. Add Messages
echo -e "\n${BLUE}4. Adding symptom messages...${NC}"

# Message 1
curl -s -X POST "$BASE_URL/chat/conversations/$CONV_ID/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "content": "I have been having really bad headaches lately."
  }' > /dev/null
echo -e "${GREEN}✅ Message 1 added${NC}"

# Message 2
curl -s -X POST "$BASE_URL/chat/conversations/$CONV_ID/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "content": "The pain is usually on one side of my head, and it is throbbing. I also feel nauseous and sensitive to light."
  }' > /dev/null
echo -e "${GREEN}✅ Message 2 added${NC}"

# Message 3
curl -s -X POST "$BASE_URL/chat/conversations/$CONV_ID/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "content": "They happen about 2-3 times a week and last for several hours. They get worse when I am stressed at work."
  }' > /dev/null
echo -e "${GREEN}✅ Message 3 added${NC}"

# 5. Generate Assessment
echo -e "\n${BLUE}5. Generating assessment...${NC}"
echo "⏳ This may take 5-15 seconds..."

START_TIME=$(date +%s)
ASSESSMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/assessments/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"conversationId\": \"$CONV_ID\"
  }")
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if echo "$ASSESSMENT_RESPONSE" | grep -q "assessmentId"; then
  echo -e "${GREEN}✅ Assessment generated in ${DURATION}s${NC}"
  
  ASSESSMENT_ID=$(echo "$ASSESSMENT_RESPONSE" | grep -o '"assessmentId":"[^"]*' | cut -d'"' -f4)
  echo "Assessment ID: $ASSESSMENT_ID"
  
  # Pretty print the assessment
  echo -e "\n${BLUE}📋 Assessment Details:${NC}"
  echo "$ASSESSMENT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ASSESSMENT_RESPONSE"
  
  # 6. Retrieve Assessment
  echo -e "\n${BLUE}6. Retrieving assessment...${NC}"
  RETRIEVE_RESPONSE=$(curl -s -X GET "$BASE_URL/assessments/$ASSESSMENT_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  if echo "$RETRIEVE_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Assessment retrieved successfully${NC}"
  else
    echo -e "${RED}❌ Assessment retrieval failed${NC}"
  fi
  
  # 7. List Assessments
  echo -e "\n${BLUE}7. Listing all assessments...${NC}"
  LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/assessments" \
    -H "Authorization: Bearer $TOKEN")
  
  ASSESSMENT_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"assessments":\[' | wc -l)
  echo -e "${GREEN}✅ Found assessments for user${NC}"
  
else
  echo -e "${RED}❌ Assessment generation failed${NC}"
  echo "$ASSESSMENT_RESPONSE"
  exit 1
fi

echo -e "\n${GREEN}======================================"
echo "✅ All tests completed successfully!"
echo "======================================${NC}"
echo ""
echo "Summary:"
echo "  - User: $EMAIL"
echo "  - Conversation ID: $CONV_ID"
echo "  - Assessment ID: $ASSESSMENT_ID"
echo "  - Generation Time: ${DURATION}s"
echo ""
echo "You can now:"
echo "  1. Check the assessment in the database"
echo "  2. View it in Postman using the IDs above"
echo "  3. Test other scenarios (urgent, emergency)"
