# Embedding Service Documentation

## Overview

The Embedding Service provides vector database integration using LangChain and Pinecone for intelligent conversation context management. It automatically generates embeddings after every 50 messages to maintain efficient context retrieval.

## Architecture

```
src/services/embedding/
├── embedding.service.js      # Main service for embedding generation & storage
├── summary.service.js         # Conversation summarization using OpenAI
├── pineconeClient.js          # Pinecone vector database client
├── index.js                   # Service exports
└── README.md                  # This file
```

## Features

- **Automatic Embedding Generation**: Triggers after every 50 messages
- **Conversation Summarization**: AI-powered summaries using GPT-4
- **Vector Search**: Semantic search for relevant conversation context
- **Metadata Tracking**: Stores embeddings metadata in PostgreSQL
- **Context Management**: Smart context retrieval based on conversation length

## Configuration

### Environment Variables

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4

# Pinecone Configuration
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=careverse-medical-knowledge
```

## Usage Examples

### 1. Initialize Services

```javascript
const { embeddingService, pineconeClient } = require('./services/embedding');

// Initialize on app startup
await embeddingService.initialize();
```

### 2. Check and Generate Embeddings

```javascript
// After creating a new message
const message = await Message.create({
  conversationId,
  role: 'user',
  content: 'I have a headache'
});

// Check if embedding is needed (automatically triggers at 50 messages)
const embedding = await embeddingService.checkAndGenerateEmbedding(conversationId);

if (embedding) {
  console.log('New embedding created:', embedding.id);
}
```

### 3. Get Conversation Context

```javascript
// For conversations < 50 messages: returns full DB context
// For conversations >= 50 messages: returns recent messages + relevant embeddings

const context = await embeddingService.getConversationContext(
  conversationId,
  'What were my previous symptoms?', // Current query for semantic search
  10 // Max messages to return
);

console.log('Context source:', context.source); // 'database' or 'vector_search'
console.log('Messages:', context.messages);
console.log('Relevant embeddings:', context.embeddings);
```

### 4. Manual Embedding Generation

```javascript
// Force embedding generation
const embedding = await embeddingService.generateAndStoreEmbedding(
  userId,
  conversationId
);
```

### 5. Summarize Conversation

```javascript
const summaryService = require('./services/embedding/summary.service');

const messages = await Message.findAll({
  where: { conversationId },
  order: [['createdAt', 'ASC']]
});

const summary = await summaryService.summarizeConversation(messages);
console.log('Summary:', summary);

// Extract key medical terms
const keyTerms = await summaryService.extractKeyTerms(messages);
console.log('Key terms:', keyTerms);

// Assess severity
const severity = await summaryService.assessSeverity(messages);
console.log('Severity:', severity); // 'low', 'medium', 'high', 'emergency'
```

### 6. Vector Search

```javascript
// Search for similar conversations
const queryVector = await embeddingService.embeddings.embedQuery(
  'headache and nausea symptoms'
);

const similarVectors = await pineconeClient.querySimilarVectors(
  queryVector,
  { userId: 'user-uuid' }, // Filter by user
  5 // Top 5 results
);

similarVectors.forEach(match => {
  console.log('Score:', match.score);
  console.log('Summary:', match.metadata.summary);
  console.log('Key terms:', match.metadata.keyTerms);
});
```

### 7. Delete Embeddings

```javascript
// Delete all embeddings for a conversation
await embeddingService.deleteConversationEmbeddings(conversationId);
```

### 8. Get Statistics

```javascript
// Get embedding statistics for a user
const stats = await embeddingService.getUserEmbeddingStats(userId);

console.log('Total embeddings:', stats.totalEmbeddings);
console.log('Conversations with embeddings:', stats.conversationsWithEmbeddings);
console.log('Total messages embedded:', stats.totalMessagesEmbedded);
```

## Integration with Chat Flow

### Recommended Implementation

```javascript
// In your chat message handler
async function handleChatMessage(userId, conversationId, userMessage) {
  // 1. Save user message
  await Message.create({
    conversationId,
    role: 'user',
    content: userMessage
  });

  // 2. Check if embedding is needed
  await embeddingService.checkAndGenerateEmbedding(conversationId);

  // 3. Get conversation context
  const context = await embeddingService.getConversationContext(
    conversationId,
    userMessage
  );

  // 4. Use context for AI response
  const aiResponse = await generateAIResponse(userMessage, context);

  // 5. Save AI response
  await Message.create({
    conversationId,
    role: 'assistant',
    content: aiResponse
  });

  return aiResponse;
}
```

## Database Schema

### Embeddings Table

```sql
CREATE TABLE embeddings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  conversation_id UUID REFERENCES conversations(id),
  pinecone_vector_id VARCHAR UNIQUE,
  summary TEXT,
  message_count INTEGER,
  start_message_id UUID,
  end_message_id UUID,
  metadata JSON,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Metadata Structure

```json
{
  "keyTerms": ["headache", "nausea", "dizziness"],
  "severity": "medium",
  "modelVersion": "text-embedding-ada-002",
  "vectorDimension": 1536
}
```

## Pinecone Vector Structure

```javascript
{
  id: "conversation-uuid-vector-uuid",
  values: [0.123, -0.456, ...], // 1536 dimensions
  metadata: {
    userId: "user-uuid",
    conversationId: "conversation-uuid",
    summary: "Patient reported headache symptoms...",
    messageCount: 50,
    keyTerms: "headache, nausea, dizziness",
    severity: "medium",
    timestamp: "2024-11-03T00:00:00.000Z"
  }
}
```

## Performance Considerations

### Message Threshold
- Default: 50 messages per embedding
- Adjustable via `embeddingService.messageThreshold`
- Balance between context freshness and API costs

### Context Retrieval Strategy
- **< 50 messages**: Full database context (fast, complete)
- **≥ 50 messages**: Recent messages + vector search (efficient, relevant)

### Cost Optimization
- Embeddings generated only when threshold is reached
- Summaries reduce token usage for embeddings
- Vector search reduces context window size

## Error Handling

```javascript
try {
  await embeddingService.generateAndStoreEmbedding(userId, conversationId);
} catch (error) {
  if (error.message.includes('Pinecone')) {
    // Handle Pinecone connection errors
    logger.error('Pinecone error:', error);
  } else if (error.message.includes('OpenAI')) {
    // Handle OpenAI API errors
    logger.error('OpenAI error:', error);
  } else {
    // Handle other errors
    logger.error('Embedding error:', error);
  }
}
```

## Testing

### Unit Tests

```javascript
describe('EmbeddingService', () => {
  it('should generate embedding after 50 messages', async () => {
    // Create 50 messages
    for (let i = 0; i < 50; i++) {
      await Message.create({
        conversationId,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`
      });
    }

    const embedding = await embeddingService.checkAndGenerateEmbedding(conversationId);
    expect(embedding).toBeDefined();
    expect(embedding.messageCount).toBe(50);
  });
});
```

## Monitoring

### Key Metrics to Track
- Embedding generation frequency
- Vector search latency
- Summary generation time
- Pinecone index size
- OpenAI API usage

### Logging

All services include comprehensive logging:
```javascript
logger.info('Generated summary for 50 messages');
logger.info('Storing embedding in Pinecone');
logger.info('Retrieved 5 similar vectors from Pinecone');
```

## Troubleshooting

### Common Issues

1. **Pinecone Connection Failed**
   - Check `PINECONE_API_KEY` is set
   - Verify index exists: `await pineconeClient.getIndexStats()`

2. **OpenAI Rate Limits**
   - Implement retry logic with exponential backoff
   - Consider using GPT-3.5 for summaries

3. **Large Context Windows**
   - Adjust `messageThreshold` to generate embeddings more frequently
   - Increase `topK` in vector search for more context

4. **Slow Vector Search**
   - Ensure Pinecone index is in the same region
   - Use metadata filters to narrow search scope

## Future Enhancements

- [ ] Batch embedding generation for existing conversations
- [ ] Automatic re-embedding when conversation context changes significantly
- [ ] Multi-language support for summaries
- [ ] Custom embedding models for medical terminology
- [ ] Embedding quality metrics and monitoring
- [ ] Automatic index optimization

## API Reference

See individual service files for detailed API documentation:
- [embedding.service.js](./embedding.service.js)
- [summary.service.js](./summary.service.js)
- [pineconeClient.js](./pineconeClient.js)
