# Tool Metrics Implementation Summary

## Overview
Implemented comprehensive performance monitoring and logging for the web search tool, including detailed metrics tracking and integration with the assessment metadata.

## Implementation Details

### 1. Enhanced Web Search Tool Logging (Task 8.1)

#### Location: `src/services/ai/tools/webSearchTool.js`

**Added Detailed Logging:**
- Log each search query with location context (city, country)
- Log search engine used (Serper vs Brave)
- Log execution time and results count
- Log cache hits and misses with execution time
- Log errors and retry attempts with attempt numbers
- Log fallback engine usage when primary fails

**Key Improvements:**
- Enhanced `search()` method to track cache hits/misses explicitly
- Updated `searchWithRetry()` to return retry count and log each attempt
- Added detailed logging for primary engine failures and fallback successes
- Improved error response to include retry count

**Example Log Output:**
```javascript
// Cache hit
logger.info('WebSearchTool: Cache hit', {
  query: 'book appointment Dr. Smith',
  location: 'US',
  executionTimeMs: 5,
  resultsCount: 3,
  searchEngine: 'serper'
});

// Cache miss
logger.info('WebSearchTool: Cache miss', {
  query: 'buy ibuprofen online',
  location: 'PK'
});

// Retry attempt
logger.info('WebSearchTool: Retrying serper search (attempt 2/3)', {
  delay: 2000,
  engineName: 'serper'
});

// Successful completion
logger.info('WebSearchTool: Search completed successfully', {
  query: 'book appointment Dr. Smith',
  location: 'US',
  resultsCount: 3,
  executionTimeMs: 456,
  searchEngine: 'serper',
  retryCount: 0,
  cached: false,
  primaryEngineFailed: false
});
```

### 2. Tool Metrics Tracking in State (Task 8.2)

#### Location: `src/services/ai/orchestrator/state.js`

**Added Tool Metrics to State:**
```javascript
toolMetrics: Annotation({
  reducer: (prev, next) => {
    // Merge tool metrics from different agents
    const prevMetrics = prev || {
      webSearchInvocations: 0,
      webSearchExecutionTimeMs: 0,
      webSearchCacheHits: 0,
      webSearchCacheMisses: 0,
      webSearchErrors: 0,
      webSearchRetries: 0
    };
    
    if (next) {
      return {
        webSearchInvocations: (prevMetrics.webSearchInvocations || 0) + (next.webSearchInvocations || 0),
        webSearchExecutionTimeMs: (prevMetrics.webSearchExecutionTimeMs || 0) + (next.webSearchExecutionTimeMs || 0),
        webSearchCacheHits: (prevMetrics.webSearchCacheHits || 0) + (next.webSearchCacheHits || 0),
        webSearchCacheMisses: (prevMetrics.webSearchCacheMisses || 0) + (next.webSearchCacheMisses || 0),
        webSearchErrors: (prevMetrics.webSearchErrors || 0) + (next.webSearchErrors || 0),
        webSearchRetries: (prevMetrics.webSearchRetries || 0) + (next.webSearchRetries || 0)
      };
    }
    
    return prevMetrics;
  },
  default: () => ({
    webSearchInvocations: 0,
    webSearchExecutionTimeMs: 0,
    webSearchCacheHits: 0,
    webSearchCacheMisses: 0,
    webSearchErrors: 0,
    webSearchRetries: 0
  })
})
```

### 3. Agent-Level Metrics Tracking

#### Provider Matcher Agent (`src/services/ai/agents/providerMatcher.js`)

**Updated to Track Metrics:**
- Modified `enrichProvidersWithBookingLinks()` to return both providers and tool metrics
- Track metrics for each web search invocation
- Aggregate metrics from all provider enrichments
- Return metrics in the response

**Metrics Tracked:**
```javascript
const toolMetrics = {
  webSearchInvocations: 0,      // Number of web searches performed
  webSearchExecutionTimeMs: 0,  // Total execution time
  webSearchCacheHits: 0,        // Number of cache hits
  webSearchCacheMisses: 0,      // Number of cache misses
  webSearchErrors: 0,           // Number of errors
  webSearchRetries: 0           // Total retry attempts
};
```

#### Product Recommender Agent (`src/services/ai/agents/productRecommender.js`)

**Updated to Track Metrics:**
- Modified `enrichProductLinks()` to return both products and tool metrics
- Delegates to `productSearch` service for enrichment
- Aggregates metrics from product search service

#### Product Search Service (`src/services/ai/tools/productSearch.js`)

**Updated to Track Metrics:**
- Modified `enrichProducts()` to return both products and tool metrics
- Modified `enrichSingleProduct()` to track metrics per product
- Aggregates metrics from all product enrichments

**Example Metrics Tracking:**
```javascript
// Track each search invocation
metrics.webSearchInvocations++;
const searchResults = await webSearchTool.search({...});

// Track metrics from search result
if (searchResults.metadata) {
  metrics.webSearchExecutionTimeMs += searchResults.metadata.executionTimeMs || 0;
  
  if (searchResults.metadata.cached) {
    metrics.webSearchCacheHits++;
  } else {
    metrics.webSearchCacheMisses++;
  }
  
  metrics.webSearchRetries += searchResults.metadata.retryCount || 0;
}

// Track errors
if (!searchResults.success) {
  metrics.webSearchErrors++;
}
```

### 4. Workflow Integration

#### Location: `src/services/ai/orchestrator/workflow.js`

**Updated Agent Nodes:**
- `providerMatcherNode()` - Returns tool metrics from provider matcher
- `productRecommenderNode()` - Returns tool metrics from product recommender
- Error handling includes empty tool metrics for graceful degradation

**Example Node Update:**
```javascript
async function providerMatcherNode(state) {
  const result = await executeWithRetry(
    async () => {
      const agentResult = await providerMatcher.findProviders({
        specialty: state.condition.requiredSpecialty,
        location: state.userLocation
      });
      
      return {
        providers: agentResult.providers,
        toolMetrics: agentResult.toolMetrics
      };
    },
    'providerMatcher',
    state
  );
  
  return {
    ...result,
    errors: [...(state.errors || []), ...(result.errors || [])],
    toolMetrics: result.toolMetrics
  };
}
```

### 5. Orchestrator Integration

#### Location: `src/services/ai/orchestrator/index.js`

**Updated `aggregateResults()` Method:**
- Extract tool metrics from final state
- Calculate cache hit rate
- Include tool metrics in assessment response
- Log tool metrics in completion message

**Tool Metrics in Response:**
```javascript
const aggregatedResult = {
  // ... other fields ...
  
  // Tool metrics
  toolMetrics: {
    webSearchInvocations: 5,
    webSearchExecutionTimeMs: 2345,
    webSearchCacheHits: 2,
    webSearchCacheMisses: 3,
    webSearchErrors: 0,
    webSearchRetries: 1,
    cacheHitRate: '40.00%'
  }
};
```

### 6. Database Schema Update

#### Assessment Model (`src/models/Assessment.js`)

**Added Tool Metrics Field:**
```javascript
toolMetrics: {
  type: DataTypes.JSON,
  field: 'tool_metrics',
  defaultValue: {
    webSearchInvocations: 0,
    webSearchExecutionTimeMs: 0,
    webSearchCacheHits: 0,
    webSearchCacheMisses: 0,
    webSearchErrors: 0,
    webSearchRetries: 0,
    cacheHitRate: '0%'
  }
}
```

#### Migration (`src/migrations/20241107000000-add-tool-metrics.js`)

**Added Column:**
- Created migration to add `tool_metrics` JSON column to assessments table
- Includes default values for all metrics
- Successfully executed migration

## Benefits

### 1. Performance Monitoring
- Track execution time for each web search
- Identify slow searches and optimize
- Monitor overall tool performance

### 2. Cache Effectiveness
- Track cache hit rate to measure effectiveness
- Identify opportunities for cache optimization
- Reduce API costs by maximizing cache usage

### 3. Error Tracking
- Monitor web search failures
- Track retry attempts
- Identify problematic queries or locations

### 4. Cost Optimization
- Track total API invocations
- Monitor cache usage to reduce API calls
- Identify high-cost operations

### 5. Debugging and Troubleshooting
- Detailed logs for each search operation
- Track retry attempts and failures
- Identify issues with specific search engines

## Testing

### Test Script: `test-tool-metrics.js`

**Tests:**
1. Single web search with metrics tracking
2. Cache hit detection on repeated search
3. Different search with different location
4. Metrics aggregation and summary

**Verified:**
- ✅ Execution time tracking
- ✅ Cache hit/miss tracking
- ✅ Retry count tracking
- ✅ Metadata structure
- ✅ Logging output

## Example Assessment Response

```json
{
  "conversationId": "uuid",
  "userId": "uuid",
  "symptoms": [...],
  "condition": {...},
  "providers": [...],
  "products": [...],
  "nextSteps": [...],
  "executionTimeMs": 15234,
  "tokensUsed": 3456,
  "toolMetrics": {
    "webSearchInvocations": 8,
    "webSearchExecutionTimeMs": 3456,
    "webSearchCacheHits": 3,
    "webSearchCacheMisses": 5,
    "webSearchErrors": 0,
    "webSearchRetries": 1,
    "cacheHitRate": "37.50%"
  }
}
```

## Monitoring Recommendations

### 1. Track Key Metrics
- Average web search execution time
- Cache hit rate (target: >50%)
- Error rate (target: <5%)
- Retry rate (target: <10%)

### 2. Set Up Alerts
- Alert if cache hit rate drops below 30%
- Alert if error rate exceeds 10%
- Alert if average execution time exceeds 2 seconds

### 3. Regular Review
- Weekly review of tool metrics
- Identify patterns in failures
- Optimize cache strategy based on usage

## Future Enhancements

1. **Per-Location Metrics**: Track metrics by country/region
2. **Search Engine Performance**: Compare Serper vs Brave performance
3. **Query Optimization**: Identify slow queries and optimize
4. **Cost Tracking**: Track API costs per assessment
5. **Real-time Dashboard**: Visualize metrics in real-time

## Conclusion

Successfully implemented comprehensive performance monitoring and logging for the web search tool. All metrics are tracked at the agent level, aggregated in the workflow, and included in the assessment response metadata. The implementation provides visibility into tool performance, cache effectiveness, and error rates, enabling data-driven optimization decisions.
