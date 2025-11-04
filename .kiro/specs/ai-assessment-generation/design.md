# Design Document

## Overview

The AI-Powered Assessment Generation feature uses a multi-agent architecture built with LangGraph to analyze user conversations and generate comprehensive health assessments. The system leverages GPT-3.5-turbo with function calling for structured medical analysis, Pinecone for conversation history retrieval, and external APIs for provider and product recommendations.

### Key Design Principles

1. **Multi-Agent Orchestration**: Specialized agents handle specific tasks (symptom extraction, medical analysis, provider matching, etc.)
2. **Function Calling**: Use OpenAI's function calling for structured, consistent outputs
3. **Parallel Execution**: Run independent agents concurrently to minimize latency
4. **Graceful Degradation**: System continues with partial results if non-critical components fail
5. **Caching Strategy**: Cache external API results to reduce costs and improve performance

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  User clicks "Check Assessment" → POST /assessments/generate │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   Express API Layer                          │
│              assessment.controller.js                        │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              LangGraph Orchestrator                          │
│                                                              │
│  1. Fetch conversation from PostgreSQL                      │
│  2. Initialize state with messages + user location          │
│  3. Execute agent workflow                                  │
│  4. Aggregate results                                       │
│  5. Save assessment to database                             │
└────────────────────────┬────────────────────────────────────┘
                         ↓
         ┌───────────────┴───────────────┐
         ↓                               ↓
┌──────────────────┐          ┌──────────────────┐
│  Sequential Flow │          │  Parallel Flow   │
└──────────────────┘          └──────────────────┘
         ↓                               ↓
    ┌────────┐                  ┌────────────────┐
    │Symptom │                  │   Provider     │
    │Extractor│                 │   Matcher      │
    └────┬───┘                  └────────────────┘
         ↓                               ↓
    ┌────────┐                  ┌────────────────┐
    │Medical │                  │   Product      │
    │Analyzer│                  │  Recommender   │
    └────┬───┘                  └────────────────┘
         ↓                               ↓
         └───────────────┬───────────────┘
                         ↓
              ┌──────────────────┐
              │ Next Steps       │
              │ Generator        │
              └──────────────────┘
                         ↓
              ┌──────────────────┐
              │ Save Assessment  │
              │ to PostgreSQL    │
              └──────────────────┘
```

### Technology Stack

- **LangGraph**: Multi-agent orchestration and state management
- **OpenAI GPT-3.5-turbo**: Language model with function calling
- **Pinecone**: Vector database for conversation history similarity search
- **PostgreSQL**: Primary database for conversations, assessments, providers
- **Google Places API**: Provider search and details
- **Redis**: Caching layer for API responses
- **Node.js/Express**: Backend framework

## Components and Interfaces

### 1. LangGraph State Schema

The shared state object passed between agents:

```typescript
interface AssessmentState {
  // Input data
  conversationId: string;
  userId: string;
  messages: Message[];
  userLocation: {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
  };
  
  // Agent outputs
  symptoms: {
    name: string;
    severity: 'mild' | 'moderate' | 'severe';
    location?: string;
    duration?: string;
    frequency?: string;
  }[];
  
  urgency: 'routine' | 'urgent' | 'emergency';
  redFlags: string[];
  
  condition: {
    name: string;
    description: string;
    commonTriggers: string[];
    initialSelfCare: string[];
    requiredSpecialty: string;
    confidence: number;
  };
  
  providers: {
    name: string;
    specialty: string;
    distance: string;
    rating: number;
    reviewCount: number;
    profileUrl?: string;
    bookingUrl?: string;
    phone: string;
    address: string;
  }[];
  
  products: {
    name: string;
    type: string;
    description: string;
    purchaseUrl?: string;
    imageUrl?: string;
    isPrescription: boolean;
  }[];
  
  nextSteps: {
    title: string;
    description: string;
    icon: string;
    actionType: 'view_providers' | 'view_products' | 'external_link' | 'emergency';
    url?: string;
  }[];
  
  // Metadata
  executionTime: number;
  tokensUsed: number;
  errors: string[];
}
```

### 2. Agent Implementations

#### 2.1 Symptom Extractor Agent

**Purpose**: Extract structured symptom data from conversation messages

**Input**: `messages: Message[]`

**Output**: Updates state with `symptoms`, `urgency`, `redFlags`

**Implementation**:
```javascript
// Uses GPT-3.5-turbo with function calling
const functions = [{
  name: "extract_symptoms",
  description: "Extract symptoms from conversation",
  parameters: {
    type: "object",
    properties: {
      symptoms: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            severity: { type: "string", enum: ["mild", "moderate", "severe"] },
            location: { type: "string" },
            duration: { type: "string" },
            frequency: { type: "string" }
          },
          required: ["name", "severity"]
        }
      },
      urgency: { 
        type: "string", 
        enum: ["routine", "urgent", "emergency"] 
      },
      redFlags: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: ["symptoms", "urgency"]
  }
}];

// Call OpenAI with function calling
const response = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [
    { role: "system", content: SYMPTOM_EXTRACTION_PROMPT },
    ...conversationMessages
  ],
  functions: functions,
  function_call: { name: "extract_symptoms" }
});
```

**Prompt Strategy**:
- System prompt with medical symptom extraction guidelines
- Examples of symptom descriptions and their structured format
- Instructions for urgency classification
- Red flag symptom list (chest pain, severe bleeding, etc.)

#### 2.2 Medical Analyzer Agent

**Purpose**: Diagnose possible condition based on symptoms

**Input**: `symptoms`, `urgency`, `redFlags`

**Output**: Updates state with `condition`

**Implementation**:
```javascript
// Step 1: Query Pinecone for similar past conversations (optional context)
const similarConversations = await pineconeService.searchSimilarConversations(
  conversationId,
  topK: 3
);

// Step 2: Use GPT-3.5-turbo with function calling for diagnosis
const functions = [{
  name: "diagnose_condition",
  description: "Diagnose possible medical condition",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      commonTriggers: {
        type: "array",
        items: { type: "string" }
      },
      initialSelfCare: {
        type: "array",
        items: { type: "string" }
      },
      requiredSpecialty: { type: "string" },
      confidence: { 
        type: "number",
        minimum: 0,
        maximum: 1
      }
    },
    required: ["name", "description", "requiredSpecialty", "confidence"]
  }
}];

const response = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [
    { role: "system", content: MEDICAL_ANALYSIS_PROMPT },
    { role: "user", content: formatSymptomsForAnalysis(symptoms) }
  ],
  functions: functions,
  function_call: { name: "diagnose_condition" }
});
```

**Prompt Strategy**:
- Medical reasoning guidelines
- Symptom-to-condition mapping patterns
- Confidence scoring criteria
- Specialty determination logic
- Safety disclaimers

#### 2.3 Provider Matcher Agent

**Purpose**: Find relevant healthcare providers near user

**Input**: `condition.requiredSpecialty`, `userLocation`

**Output**: Updates state with `providers`

**Implementation**:
```javascript
// Step 1: Check Redis cache
const cacheKey = `providers:${specialty}:${lat}:${lng}`;
let providers = await redis.get(cacheKey);

if (!providers) {
  // Step 2: Search local database first
  providers = await Provider.findAll({
    where: {
      specialty: { [Op.iLike]: `%${specialty}%` }
    },
    attributes: {
      include: [
        [sequelize.literal(`
          6371 * 0.621371 * ACOS(
            COS(RADIANS(${lat})) * COS(RADIANS(latitude)) * 
            COS(RADIANS(longitude) - RADIANS(${lng})) + 
            SIN(RADIANS(${lat})) * SIN(RADIANS(latitude))
          )
        `), 'distance_miles']
      ]
    },
    having: sequelize.where(
      sequelize.literal('distance_miles'),
      '<=',
      25
    ),
    order: [[sequelize.literal('distance_miles'), 'ASC']],
    limit: 10
  });
  
  // Step 3: If insufficient results, query Google Places API
  if (providers.length < 5) {
    const googleProviders = await googlePlacesService.searchProviders({
      specialty,
      location: { lat, lng },
      radius: 25 * 1609.34 // miles to meters
    });
    
    providers = [...providers, ...googleProviders];
  }
  
  // Step 4: Enrich with booking links (web scraping or API)
  providers = await enrichProvidersWithBookingLinks(providers);
  
  // Step 5: Cache results for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(providers));
}

return providers.slice(0, 10);
```

**External API Integration**:
- Google Places API for provider search
- Google Places Details API for additional info
- Web scraping for booking links (Zocdoc, Healthgrades, etc.)

#### 2.4 Product Recommender Agent

**Purpose**: Recommend medications and products for the condition

**Input**: `condition.name`, `symptoms`

**Output**: Updates state with `products`

**Implementation**:
```javascript
// Step 1: Check Redis cache
const cacheKey = `products:${condition.name}`;
let products = await redis.get(cacheKey);

if (!products) {
  // Step 2: Use GPT-3.5-turbo with function calling
  const functions = [{
    name: "recommend_products",
    description: "Recommend medications and products",
    parameters: {
      type: "object",
      properties: {
        products: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string" },
              description: { type: "string" },
              isPrescription: { type: "boolean" }
            },
            required: ["name", "type", "isPrescription"]
          }
        }
      },
      required: ["products"]
    }
  }];
  
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: PRODUCT_RECOMMENDATION_PROMPT },
      { role: "user", content: `Condition: ${condition.name}\nSymptoms: ${symptoms.map(s => s.name).join(', ')}` }
    ],
    functions: functions,
    function_call: { name: "recommend_products" }
  });
  
  products = JSON.parse(response.choices[0].message.function_call.arguments).products;
  
  // Step 3: Enrich with purchase links and images
  products = await enrichProductsWithLinks(products);
  
  // Step 4: Cache for 24 hours
  await redis.setex(cacheKey, 86400, JSON.stringify(products));
}

return products.slice(0, 8);
```

**Product Link Sources**:
- Amazon Product API
- 1mg API (for Indian market)
- CVS/Walgreens APIs
- Generic search with web scraping

#### 2.5 Next Steps Generator Agent

**Purpose**: Generate actionable next steps for the user

**Input**: `condition`, `urgency`, `providers`, `products`

**Output**: Updates state with `nextSteps`

**Implementation**:
```javascript
const functions = [{
  name: "generate_next_steps",
  description: "Generate actionable next steps",
  parameters: {
    type: "object",
    properties: {
      nextSteps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            icon: { type: "string" },
            actionType: { 
              type: "string",
              enum: ["view_providers", "view_products", "external_link", "emergency"]
            },
            url: { type: "string" }
          },
          required: ["title", "description", "icon", "actionType"]
        }
      }
    },
    required: ["nextSteps"]
  }
}];

const response = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [
    { role: "system", content: NEXT_STEPS_PROMPT },
    { role: "user", content: formatContextForNextSteps(state) }
  ],
  functions: functions,
  function_call: { name: "generate_next_steps" }
});

// Add URLs based on action type
const nextSteps = JSON.parse(response.choices[0].message.function_call.arguments).nextSteps;
nextSteps.forEach(step => {
  if (step.actionType === 'view_providers') {
    step.url = `/providers?specialty=${condition.requiredSpecialty}`;
  } else if (step.actionType === 'view_products') {
    step.url = `/products?condition=${condition.name}`;
  }
});

return nextSteps;
```

### 3. LangGraph Workflow Definition

```javascript
import { StateGraph, Annotation } from "@langchain/langgraph";

// Define state annotation
const AssessmentStateAnnotation = Annotation.Root({
  conversationId: Annotation<string>,
  userId: Annotation<string>,
  messages: Annotation<Message[]>,
  userLocation: Annotation<Location>,
  symptoms: Annotation<Symptom[]>,
  urgency: Annotation<string>,
  redFlags: Annotation<string[]>,
  condition: Annotation<Condition>,
  providers: Annotation<Provider[]>,
  products: Annotation<Product[]>,
  nextSteps: Annotation<NextStep[]>,
  executionTime: Annotation<number>,
  tokensUsed: Annotation<number>,
  errors: Annotation<string[]>
});

// Create workflow graph
const workflow = new StateGraph(AssessmentStateAnnotation)
  // Add nodes (agents)
  .addNode("symptomExtractor", symptomExtractorAgent)
  .addNode("medicalAnalyzer", medicalAnalyzerAgent)
  .addNode("providerMatcher", providerMatcherAgent)
  .addNode("productRecommender", productRecommenderAgent)
  .addNode("nextStepsGenerator", nextStepsGeneratorAgent)
  
  // Define edges (execution flow)
  .addEdge("__start__", "symptomExtractor")
  .addEdge("symptomExtractor", "medicalAnalyzer")
  
  // Parallel execution after medical analysis
  .addConditionalEdges(
    "medicalAnalyzer",
    (state) => {
      // Check if we should proceed with recommendations
      if (state.urgency === 'emergency') {
        return ["nextStepsGenerator"]; // Skip provider/product search for emergencies
      }
      return ["providerMatcher", "productRecommender"];
    }
  )
  
  // Converge to next steps generator
  .addEdge("providerMatcher", "nextStepsGenerator")
  .addEdge("productRecommender", "nextStepsGenerator")
  .addEdge("nextStepsGenerator", "__end__");

// Compile the graph
const app = workflow.compile();

// Execute workflow
const result = await app.invoke(initialState);
```

### 4. API Endpoint Design

#### POST /api/v1/assessments/generate

**Request**:
```json
{
  "conversationId": "uuid"
}
```

**Response** (Success - 201):
```json
{
  "success": true,
  "message": "Assessment generated successfully",
  "data": {
    "assessmentId": "uuid",
    "possibleCondition": {
      "name": "Migraine",
      "description": "A neurological condition that can cause multiple symptoms...",
      "commonTriggers": [
        "Stress, hormonal changes, certain foods & drinks",
        "Lack of sleep"
      ],
      "initialSelfCare": [
        "Rest in a quiet, dark room, apply a cold compress, stay hydrated"
      ]
    },
    "nextSteps": [
      {
        "title": "Book a Neurologist",
        "description": "Find a local specialist",
        "icon": "doctor",
        "actionType": "view_providers"
      },
      {
        "title": "Explore Stress Relief Programs",
        "description": "Discover coping mechanisms",
        "icon": "meditation",
        "actionType": "external_link",
        "url": "https://..."
      },
      {
        "title": "View Relevant Medications",
        "description": "Learn about treatment options",
        "icon": "medication",
        "actionType": "view_products"
      }
    ],
    "providers": [
      {
        "name": "Dr. Evelyn Reed",
        "specialty": "Neurologist",
        "distance": "2.1 miles away",
        "rating": 4.9,
        "reviewCount": 125,
        "profileUrl": "https://...",
        "bookingUrl": "https://...",
        "phone": "(415) 555-0100",
        "address": "123 Medical Plaza, San Francisco, CA"
      }
    ],
    "products": [
      {
        "name": "Ibuprofen",
        "type": "OTC Pain Reliever",
        "description": "For headache relief",
        "purchaseUrl": "https://...",
        "imageUrl": "https://...",
        "isPrescription": false
      }
    ],
    "severity": "medium",
    "confidence": 0.85,
    "disclaimer": "This is not a medical diagnosis. Please consult with a healthcare professional for an accurate diagnosis."
  }
}
```

**Response** (Error - 400):
```json
{
  "success": false,
  "message": "Insufficient conversation data. Please continue the conversation before generating an assessment.",
  "error": "INSUFFICIENT_DATA"
}
```

**Response** (Error - 500):
```json
{
  "success": false,
  "message": "Failed to generate assessment. Please try again.",
  "error": "GENERATION_FAILED"
}
```

#### GET /api/v1/assessments/:assessmentId

**Response** (Success - 200):
```json
{
  "success": true,
  "data": {
    "assessment": {
      // Same structure as generate response
    }
  }
}
```

## Data Models

### Updated Assessment Model

```javascript
const Assessment = sequelize.define('Assessment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'conversation_id'
  },
  
  // Condition information
  possibleCondition: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'possible_condition'
  },
  description: {
    type: DataTypes.TEXT
  },
  
  // Extracted symptoms (structured)
  extractedSymptoms: {
    type: DataTypes.JSON,
    field: 'extracted_symptoms',
    defaultValue: []
  },
  
  // Triggers and self-care
  commonTriggers: {
    type: DataTypes.JSON,
    field: 'common_triggers',
    defaultValue: []
  },
  initialSelfCare: {
    type: DataTypes.JSON,
    field: 'initial_self_care',
    defaultValue: []
  },
  
  // Recommendations
  nextSteps: {
    type: DataTypes.JSON,
    field: 'next_steps',
    defaultValue: []
  },
  providers: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  products: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  
  // Metadata
  requiredSpecialty: {
    type: DataTypes.STRING,
    field: 'required_specialty'
  },
  urgency: {
    type: DataTypes.ENUM('routine', 'urgent', 'emergency'),
    defaultValue: 'routine'
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'emergency'),
    defaultValue: 'medium'
  },
  confidence: {
    type: DataTypes.FLOAT,
    validate: { min: 0, max: 1 }
  },
  
  // Red flags
  redFlags: {
    type: DataTypes.JSON,
    field: 'red_flags',
    defaultValue: []
  },
  
  // Disclaimer
  disclaimer: {
    type: DataTypes.TEXT,
    defaultValue: 'This is not a medical diagnosis. Please consult with a healthcare professional for an accurate diagnosis.'
  },
  
  // Performance metrics
  executionTimeMs: {
    type: DataTypes.INTEGER,
    field: 'execution_time_ms'
  },
  tokensUsed: {
    type: DataTypes.INTEGER,
    field: 'tokens_used'
  }
}, {
  tableName: 'assessments',
  timestamps: true
});
```

## Error Handling

### Error Types and Handling Strategy

1. **Insufficient Conversation Data**
   - Check: Conversation has at least 2 user messages
   - Response: 400 Bad Request with helpful message
   - Action: Prompt user to continue conversation

2. **OpenAI API Failure**
   - Retry: Up to 2 times with exponential backoff
   - Fallback: Return error after retries
   - Response: 500 Internal Server Error
   - Logging: Log full error details

3. **Pinecone Query Failure**
   - Fallback: Continue without conversation history context
   - Logging: Log warning
   - Impact: Minimal - analysis proceeds with current conversation only

4. **Provider Search Failure**
   - Fallback: Return assessment without provider recommendations
   - Response: Include message suggesting online consultation
   - Logging: Log error

5. **Product Recommendation Failure**
   - Fallback: Return assessment without product recommendations
   - Logging: Log error
   - Impact: Non-critical - assessment still valuable

6. **Timeout (>30 seconds)**
   - Action: Cancel operation
   - Response: 504 Gateway Timeout
   - Logging: Log timeout with state snapshot

### Error Response Format

```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": "ERROR_CODE",
  "details": {
    // Additional context (only in development)
  }
}
```

## Testing Strategy

### Unit Tests

1. **Symptom Extractor Agent**
   - Test with various conversation formats
   - Verify structured output format
   - Test urgency classification
   - Test red flag detection

2. **Medical Analyzer Agent**
   - Test with different symptom combinations
   - Verify confidence scoring
   - Test specialty determination
   - Test function calling response parsing

3. **Provider Matcher Agent**
   - Test distance calculations
   - Test database queries
   - Test Google Places API integration
   - Test caching behavior

4. **Product Recommender Agent**
   - Test product recommendations
   - Test prescription vs OTC classification
   - Test caching behavior

5. **Next Steps Generator Agent**
   - Test with different urgency levels
   - Test action type assignment
   - Test URL generation

### Integration Tests

1. **Full Workflow Test**
   - Create test conversation
   - Trigger assessment generation
   - Verify all components execute
   - Verify database persistence

2. **Error Handling Test**
   - Simulate API failures
   - Verify fallback behavior
   - Verify error responses

3. **Performance Test**
   - Measure end-to-end execution time
   - Verify <15 second completion
   - Test concurrent requests

### End-to-End Tests

1. **User Journey Test**
   - User creates conversation
   - User sends multiple messages
   - User generates assessment
   - User views assessment details
   - Verify all data displayed correctly

## Performance Optimization

### Caching Strategy

1. **Provider Search Results**
   - Key: `providers:{specialty}:{lat}:{lng}`
   - TTL: 1 hour
   - Invalidation: Manual or time-based

2. **Product Recommendations**
   - Key: `products:{conditionName}`
   - TTL: 24 hours
   - Invalidation: Manual or time-based

3. **Conversation Embeddings**
   - Stored in Pinecone
   - Updated when conversation is completed
   - Used for similarity search

### Parallel Execution

- Provider Matcher, Product Recommender, and Next Steps Generator run in parallel after Medical Analyzer completes
- Reduces total execution time by ~40%

### Token Optimization

- Use GPT-3.5-turbo (cheaper than GPT-4)
- Limit conversation history to last 20 messages
- Use concise system prompts
- Implement token counting and limits

### Database Optimization

- Index on `user_id` and `conversation_id` in assessments table
- Index on `specialty`, `latitude`, `longitude` in providers table
- Use connection pooling (already configured)

## Security Considerations

### Data Privacy

- Never log sensitive health information
- Encrypt assessment data at rest (PostgreSQL encryption)
- Use HTTPS for all API communications
- Implement rate limiting per user

### API Key Security

- Store API keys in environment variables
- Rotate keys regularly
- Monitor API usage for anomalies
- Implement request signing for external APIs

### Input Validation

- Validate conversation ID format (UUID)
- Verify conversation belongs to authenticated user
- Sanitize all user inputs
- Limit conversation message length

### Medical Disclaimer

- Always include disclaimer in responses
- Clearly state AI limitations
- Recommend professional consultation
- Highlight emergency symptoms prominently

## Deployment Considerations

### Environment Variables

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo

# Pinecone
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX_NAME=careverse-conversations

# Google Places
GOOGLE_PLACES_API_KEY=...

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=...

# Feature Flags
ENABLE_PROVIDER_SEARCH=true
ENABLE_PRODUCT_RECOMMENDATIONS=true
ENABLE_CONVERSATION_HISTORY_RAG=true
```

### Monitoring

- Log all assessment generation requests
- Track execution time per agent
- Monitor token usage and costs
- Alert on error rate >5%
- Track cache hit rates

### Scalability

- Horizontal scaling: Stateless design allows multiple instances
- Database: Connection pooling configured
- Redis: Cluster mode for high availability
- Rate limiting: Per user and global limits
- Queue system: Consider Bull for async processing if needed
