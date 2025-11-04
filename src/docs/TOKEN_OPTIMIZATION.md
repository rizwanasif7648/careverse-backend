# Token Usage Optimization

This document describes the token optimization strategies implemented in the AI Assessment Generation system.

## Overview

Token optimization is critical for:
- **Cost reduction**: Lower API costs by reducing token consumption
- **Performance**: Faster response times with smaller payloads
- **Scalability**: Handle more requests within rate limits

## Optimization Strategies

### 1. Concise System Prompts

All system prompts have been optimized to be concise while maintaining clarity:

**Before (Symptom Extraction):**
```
You are a medical symptom extraction specialist. Your role is to analyze patient conversations and extract structured symptom information.

Guidelines:
- Identify all symptoms mentioned in the conversation
- Extract symptom attributes: name, severity, location, duration, and frequency
...
(~250 tokens)
```

**After:**
```
Extract structured symptom data from patient conversations.

Extract: name, severity (mild/moderate/severe), location, duration, frequency
Urgency: routine (mild, no danger), urgent (needs 24-48h care), emergency (life-threatening)
...
(~60 tokens)
```

**Savings: ~76% reduction in system prompt tokens**

### 2. Conversation History Limiting

Conversations are limited to the last 20 messages:

```javascript
// In orchestrator/index.js
include: [
  {
    model: this.db.Message,
    as: 'messages',
    limit: 20,  // Limit to last 20 messages
    order: [['createdAt', 'DESC']]
  }
]
```

**Benefits:**
- Reduces input tokens by up to 70% for long conversations
- Focuses on recent, relevant context
- Improves query performance

### 3. Message Truncation

Messages are further truncated if they exceed token limits:

```javascript
// In tokenCounter.js
function truncateMessages(messages, maxTokens = 3000) {
  // Keep system message + most recent messages that fit
  // Removes oldest messages first
}
```

**Benefits:**
- Ensures requests never exceed model limits
- Maintains most relevant context
- Prevents API errors

### 4. Token Counting and Logging

All agents log token usage for monitoring:

```javascript
const { logTokenUsage } = require('../../../utils/tokenCounter');

// After API call
logTokenUsage('AgentName', response.usage);
```

**Logged metrics:**
- Prompt tokens (input)
- Completion tokens (output)
- Total tokens
- Estimated cost

### 5. Caching Strategy

Aggressive caching reduces redundant API calls:

**Provider Search Cache:**
- TTL: 1 hour
- Key: `providers:{specialty}:{lat}:{lng}`
- Tokens saved: ~500-800 per cache hit

**Product Recommendations Cache:**
- TTL: 24 hours
- Key: `products:{condition_name}`
- Tokens saved: ~400-600 per cache hit

## Token Usage by Agent

### Typical Token Consumption

| Agent | Input Tokens | Output Tokens | Total | Cost (GPT-3.5) |
|-------|-------------|---------------|-------|----------------|
| Symptom Extractor | 800-1200 | 150-250 | 950-1450 | $0.0014-$0.0022 |
| Medical Analyzer | 400-600 | 200-300 | 600-900 | $0.0009-$0.0014 |
| Provider Matcher | 0 (cached) | 0 | 0 | $0 |
| Product Recommender | 300-500 | 150-250 | 450-750 | $0.0007-$0.0011 |
| Next Steps Generator | 500-700 | 100-200 | 600-900 | $0.0009-$0.0014 |
| **Total per Assessment** | **2000-3000** | **600-1200** | **2600-4200** | **$0.0039-$0.0063** |

### With Caching (50% hit rate)

| Scenario | Total Tokens | Cost |
|----------|-------------|------|
| No cache hits | 2600-4200 | $0.0039-$0.0063 |
| 50% cache hits | 1800-2900 | $0.0027-$0.0044 |
| 100% cache hits | 1000-1800 | $0.0015-$0.0027 |

## Monitoring Token Usage

### View Token Statistics

```javascript
const { getTokenSummary } = require('./utils/tokenCounter');

// After workflow execution
const summary = getTokenSummary([
  { name: 'SymptomExtractor', tokensUsed: 1200 },
  { name: 'MedicalAnalyzer', tokensUsed: 800 },
  // ...
]);

console.log(summary);
// {
//   totalOperations: 5,
//   totalTokens: 3500,
//   totalCost: 0.00525,
//   byOperation: { ... }
// }
```

### Check Logs

Token usage is automatically logged:

```
TokenCounter: SymptomExtractorAgent {
  promptTokens: 1050,
  completionTokens: 180,
  totalTokens: 1230,
  estimatedCost: '$0.001845'
}
```

## Best Practices

### 1. Use Caching Aggressively

Always check cache before making API calls:

```javascript
// Check cache first
const cached = await redis.get(cacheKey);
if (cached) {
  return { data: JSON.parse(cached), tokensUsed: 0 };
}

// Make API call only if cache miss
const result = await openai.chat.completions.create(...);
```

### 2. Limit Conversation History

Only include relevant messages:

```javascript
// Limit to last 20 messages
const recentMessages = messages.slice(-20);
```

### 3. Use Lower Temperature

Lower temperature = more deterministic = better caching:

```javascript
temperature: 0.3  // Instead of 0.7 or 1.0
```

### 4. Optimize Function Schemas

Keep function definitions concise:

```javascript
// Good: Concise description
description: "Extract symptoms from conversation"

// Bad: Verbose description
description: "This function is designed to extract and structure symptom information from natural language patient conversations, including details about severity, location, duration, and frequency of each symptom mentioned."
```

### 5. Monitor and Alert

Set up alerts for high token usage:

```javascript
if (totalTokens > 5000) {
  logger.warn('High token usage detected', { totalTokens });
}
```

## Cost Optimization Tips

### 1. Batch Similar Requests

If possible, batch similar assessments to leverage caching.

### 2. Use GPT-3.5-turbo

GPT-3.5-turbo is 10-20x cheaper than GPT-4:
- GPT-3.5-turbo: $0.0005-$0.0015 per 1K tokens
- GPT-4: $0.03-$0.06 per 1K tokens

### 3. Implement Rate Limiting

Prevent abuse and control costs:

```javascript
// Limit assessments per user per day
const dailyLimit = 10;
```

### 4. Monitor Cache Hit Rates

Target 50%+ cache hit rate:

```javascript
const hitRate = (cacheHits / totalRequests) * 100;
if (hitRate < 50) {
  logger.warn('Low cache hit rate', { hitRate });
}
```

## Future Optimizations

### 1. Streaming Responses

Stream responses to reduce perceived latency:

```javascript
const stream = await openai.chat.completions.create({
  stream: true,
  // ...
});
```

### 2. Prompt Compression

Use prompt compression techniques:
- Remove redundant words
- Use abbreviations
- Compress JSON schemas

### 3. Model Fine-tuning

Fine-tune models for specific tasks to reduce prompt size.

### 4. Semantic Caching

Cache based on semantic similarity, not exact matches:

```javascript
// Cache key based on symptom similarity
const cacheKey = await generateSemanticKey(symptoms);
```

## Conclusion

Token optimization is an ongoing process. Monitor usage regularly and adjust strategies as needed. Target metrics:

- **Average tokens per assessment**: < 3000
- **Cache hit rate**: > 50%
- **Average cost per assessment**: < $0.005
- **95th percentile execution time**: < 15 seconds
