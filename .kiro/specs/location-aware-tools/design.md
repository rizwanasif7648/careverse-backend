# Design Document

## Overview

This design document outlines the architecture for implementing dynamic, location-aware tools in the AI assessment system using LangGraph's tool calling capabilities. The enhancement will replace hardcoded URLs with intelligent web search tools that find real, current booking links and product URLs based on the user's location and conversation context.

The system will leverage LangGraph's tool binding feature to allow agents to invoke web search functions dynamically, similar to AutoGen's tool functionality. Agents will use web search to discover location-appropriate healthcare booking platforms, e-commerce sites, and provider information in real-time, making the system truly dynamic and globally applicable without maintaining hardcoded platform lists.

**Key Principle:** No hardcoded platform mappings. Everything is discovered dynamically through web search based on user location and context.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Assessment Orchestrator                   │
│                  (Existing - No Changes)                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼────────┐     ┌───────▼────────┐
        │  Agent Layer   │     │  Tool Registry │
        │  (Enhanced)    │     │    (New)       │
        │                │     │                │
        │ - Provider     │◄────┤ - Web Search   │
        │   Matcher      │     │   Tool Binding │
        │ - Product      │     │ - Tool Config  │
        │   Recommender  │     └────────┬───────┘
        │ - Next Steps   │              │
        │   Generator    │              │
        └────────┬───────┘              │
                 │                      │
                 └──────────┬───────────┘
                            │
                    ┌───────▼────────┐
                    │ Web Search Tool│
                    │     (New)      │
                    │                │
                    │ - Serper API   │
                    │ - Brave Search │
                    │ - Query Builder│
                    └────────┬───────┘
                             │
                ┌────────────┴────────────┐
                │                         │
        ┌───────▼────────┐      ┌────────▼─────────┐
        │  Search APIs   │      │  Cache Layer     │
        │                │      │                  │
        │ - Serper.dev   │      │ - Location-based │
        │ - Brave Search │      │   Cache Keys     │
        │                │      │ - TTL Management │
        └────────────────┘      │ - Redis          │
                                └──────────────────┘
```

### Component Interaction Flow

1. **User Request** → Assessment Orchestrator extracts location from user profile (existing)
2. **Tool Binding** → Agents bind to web search tool via Tool Registry
3. **Dynamic Search** → Agents construct location-aware search queries
4. **Tool Invocation** → Agents invoke web search tool with query + location context
5. **Web Search** → Tool searches web using Serper/Brave API with location parameters
6. **Result Parsing** → Tool extracts relevant URLs and information from search results
7. **Result Caching** → Results cached with location-aware keys
8. **Response** → Dynamic, location-specific data returned (same response structure as current)

## Components and Interfaces

### 1. Web Search Tool (Core Component)

**Purpose:** Performs intelligent web searches to find location-specific booking links, product URLs, and provider information

**Location:** `src/services/ai/tools/webSearchTool.js`

**Interface:**
```javascript
class WebSearchTool {
  /**
   * Perform location-aware web search
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search query
   * @param {Object} params.location - User location {country, city, latitude, longitude}
   * @param {number} params.maxResults - Maximum results (default: 5)
   * @returns {Promise<Array>} Search results with URLs and snippets
   */
  async search(params)

  /**
   * Build location-aware search query
   * @param {string} baseQuery - Base search query
   * @param {Object} location - User location
   * @returns {string} Enhanced query with location context
   */
  buildLocationQuery(baseQuery, location)

  /**
   * Search using Serper API (primary)
   * @param {string} query - Search query
   * @param {string} countryCode - ISO country code for localized results
   * @param {number} maxResults - Maximum results
   * @returns {Promise<Array>} Search results
   */
  async searchWithSerper(query, countryCode, maxResults)

  /**
   * Search using Brave Search API (fallback)
   * @param {string} query - Search query
   * @param {string} countryCode - ISO country code
   * @param {number} maxResults - Maximum results
   * @returns {Promise<Array>} Search results
   */
  async searchWithBrave(query, countryCode, maxResults)

  /**
   * Extract and validate URLs from search results
   * @param {Array} results - Raw search results
   * @returns {Array} Validated results with URLs
   */
  extractUrls(results)

  /**
   * Format search results for agent consumption
   * @param {Array} rawResults - Raw search results
   * @returns {Array} Formatted results
   */
  formatResults(rawResults)
}
```

### 2. Tool Registry

**Purpose:** Manages web search tool and binds it to agents

**Location:** `src/services/ai/tools/toolRegistry.js`

**Interface:**
```javascript
class ToolRegistry {
  /**
   * Initialize tool registry with web search tool
   * @param {Object} config - Tool configuration
   */
  constructor(config)

  /**
   * Get web search tool for agents
   * @returns {Object} Web search tool definition for LangGraph
   */
  getWebSearchTool()

  /**
   * Bind web search tool to agent
   * @param {Object} agent - Agent instance
   * @returns {Object} Agent with bound tool
   */
  bindToolToAgent(agent)
}
```

### 3. Web Search Tool Schema (LangGraph)

**Purpose:** LangGraph tool schema for web search

**Schema:**
```javascript
const webSearchToolSchema = {
  name: 'web_search',
  description: 'Search the web to find current information about healthcare providers, booking platforms, medical products, or health resources. Use this to find location-specific booking links, product purchase URLs, and provider information.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query - be specific and include location context'
      },
      location: {
        type: 'object',
        description: 'User location context',
        properties: {
          country: { type: 'string' },
          city: { type: 'string' },
          countryCode: { type: 'string' }
        }
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results (default: 5)'
      }
    },
    required: ['query', 'location']
  }
};
```

### 4. Updated Agent Implementations

#### Provider Matcher Agent with Web Search Tool

**Location:** `src/services/ai/agents/providerMatcher.js` (updated)

**Changes:**
- Bind web search tool
- Use web search to find booking links dynamically
- Construct intelligent search queries based on provider info and location

**Tool Usage Pattern:**
```javascript
// Dynamic web search for booking links
const searchQuery = `book appointment ${provider.name} ${provider.specialty} ${location.city} ${location.country}`;

const searchResults = await this.webSearchTool.search({
  query: searchQuery,
  location: location,
  maxResults: 3
});

// Extract booking URL from search results
provider.bookingUrl = this.extractBookingUrl(searchResults);
provider.profileUrl = searchResults[0]?.url || provider.website;
```

#### Product Recommender Agent with Web Search Tool

**Location:** `src/services/ai/agents/productRecommender.js` (updated)

**Changes:**
- Bind web search tool
- Use web search to find product purchase links dynamically
- Search for products in user's location

**Tool Usage Pattern:**
```javascript
// Dynamic web search for product purchase links
const searchQuery = `buy ${product.name} online ${location.city} ${location.country}`;

const searchResults = await this.webSearchTool.search({
  query: searchQuery,
  location: location,
  maxResults: 3
});

// Extract purchase URL from search results
product.purchaseUrl = this.extractPurchaseUrl(searchResults);
product.imageUrl = searchResults[0]?.image || null;
```

#### Next Steps Generator Agent with Web Search Tool

**Location:** `src/services/ai/agents/nextStepsGenerator.js` (updated)

**Changes:**
- Already has access to web search tool
- Use tool to find location-specific health resources
- Generate dynamic next step URLs based on search results

## Data Models

### Location Context (Existing - No Changes)

```javascript
{
  country: 'PK',           // ISO country code
  countryName: 'Pakistan', // Full country name
  city: 'Lahore',
  state: 'Punjab',
  latitude: 31.5204,
  longitude: 74.3587
}
```

### Web Search Tool Result

```javascript
{
  success: true,
  results: [
    {
      title: 'Dr. Ahmed Khan - Cardiologist | Book Appointment',
      url: 'https://marham.pk/doctors/lahore/cardiologist/dr-ahmed-khan',
      snippet: 'Book appointment with Dr. Ahmed Khan, top cardiologist in Lahore...',
      position: 1
    },
    {
      title: 'Cardiologist in Lahore - Online Booking',
      url: 'https://oladoc.com/pakistan/lahore/cardiologist/dr-ahmed-khan',
      snippet: 'Schedule appointment online with Dr. Ahmed Khan...',
      position: 2
    }
  ],
  metadata: {
    query: 'book appointment Dr. Ahmed Khan cardiologist Lahore Pakistan',
    location: 'PK',
    executionTimeMs: 456,
    cached: false,
    searchEngine: 'serper'
  }
}
```

### Web Search Tool Error Response

```javascript
{
  success: false,
  results: [],
  metadata: {
    query: 'book appointment Dr. Ahmed Khan cardiologist Lahore Pakistan',
    location: 'PK',
    executionTimeMs: 5000,
    cached: false,
    retryCount: 2,
    searchEngine: 'serper'
  },
  error: {
    code: 'SEARCH_API_ERROR',
    message: 'Serper API timeout',
    fallbackAttempted: true
  }
}
```

## Error Handling

### Tool Invocation Errors

1. **Network Errors**
   - Retry up to 2 times with exponential backoff (1s, 2s)
   - If all retries fail, use fallback platform or web search
   - Log error with context for monitoring

2. **API Rate Limits**
   - Implement per-platform rate limiting
   - Queue requests when limit reached
   - Return cached results when available
   - Use alternative platform if primary is rate-limited

3. **Invalid Responses**
   - Validate response schema
   - Discard invalid data
   - Log validation errors
   - Use fallback or return partial results

4. **Platform Unavailable**
   - Try alternative platforms for the region
   - Fall back to web search
   - Return generic URLs as last resort
   - Mark section as incomplete in response

### Graceful Degradation

```javascript
// Try web search with retry logic
try {
  const searchResults = await this.webSearchTool.search({
    query: this.buildSearchQuery(provider, location),
    location: location,
    maxResults: 5
  });
  
  if (searchResults.success && searchResults.results.length > 0) {
    return this.extractBestUrl(searchResults.results);
  }
} catch (error) {
  logger.warn('Web search failed, using fallback');
}

// Fallback: return provider's website or generic search URL
return provider.website || this.generateGenericSearchUrl(provider, location);
```

## Testing Strategy

### Unit Tests

1. **Region Detector Tests**
   - Test country code detection
   - Test platform mapping for each supported country
   - Test fallback behavior for unsupported countries

2. **Tool Registry Tests**
   - Test tool registration
   - Test tool binding to agents
   - Test tool retrieval by agent and location

3. **Individual Tool Tests**
   - Mock external API calls
   - Test successful responses
   - Test error handling
   - Test retry logic
   - Test caching behavior

### Integration Tests

1. **Agent-Tool Integration**
   - Test Provider Matcher with booking tool
   - Test Product Recommender with product tool
   - Test Next Steps Generator with web search tool
   - Verify tool invocations in workflow

2. **Multi-Region Tests**
   - Test assessment generation for US user
   - Test assessment generation for Pakistan user
   - Test assessment generation for India user
   - Test assessment generation for UK user
   - Test assessment generation for Australia user
   - Verify correct platform selection for each region

3. **Fallback Tests**
   - Test behavior when primary platform fails
   - Test behavior when all platforms fail
   - Test behavior with missing location data
   - Verify graceful degradation

### End-to-End Tests

1. **Complete Assessment Flow**
   - Generate assessment with location-aware tools
   - Verify booking URLs are region-appropriate
   - Verify product URLs are region-appropriate
   - Verify next steps are location-specific

2. **Performance Tests**
   - Measure tool invocation overhead
   - Verify total execution time < 20 seconds
   - Test with concurrent requests
   - Verify cache effectiveness

3. **Error Scenario Tests**
   - Test with API failures
   - Test with rate limiting
   - Test with invalid responses
   - Verify system continues to function

## Performance Considerations

### Caching Strategy

1. **Location-Aware Cache Keys**
   ```javascript
   // Format: tool:country:params_hash
   const cacheKey = `booking:PK:${hash(providerName + specialty)}`;
   ```

2. **TTL Settings**
   - Booking platform results: 1 hour
   - Product search results: 24 hours
   - Web search results: 6 hours
   - Platform availability: 5 minutes

3. **Cache Warming**
   - Pre-cache common searches for major cities
   - Update cache during off-peak hours

### Parallel Tool Invocation

```javascript
// Invoke multiple tools in parallel when possible
const [bookingResults, productResults] = await Promise.all([
  this.invokeBookingTool(bookingParams),
  this.invokeProductTool(productParams)
]);
```

### Rate Limiting

```javascript
class RateLimiter {
  constructor(requestsPerMinute) {
    this.limit = requestsPerMinute;
    this.queue = [];
    this.processing = false;
  }

  async throttle(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const { fn, resolve, reject } = this.queue.shift();
    
    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    }
    
    setTimeout(() => {
      this.processing = false;
      this.processQueue();
    }, 60000 / this.limit);
  }
}
```

## Security Considerations

### URL Validation

```javascript
// Basic URL validation - ensure it's a valid URL and uses HTTPS
function validateUrl(url) {
  try {
    const parsedUrl = new URL(url);
    
    // Must use HTTPS
    if (parsedUrl.protocol !== 'https:') {
      return false;
    }
    
    // Must have a valid hostname
    if (!parsedUrl.hostname || parsedUrl.hostname.length < 3) {
      return false;
    }
    
    // Blacklist obviously malicious patterns
    const blacklist = ['javascript:', 'data:', 'file:', 'localhost'];
    if (blacklist.some(pattern => url.toLowerCase().includes(pattern))) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}
```

### API Key Management

- Store all API keys in environment variables
- Never log API keys
- Rotate keys regularly
- Use separate keys for development and production
- Implement key usage monitoring

### Input Sanitization

```javascript
function sanitizeSearchQuery(query) {
  // Remove special characters that could be used for injection
  return query
    .replace(/[<>\"']/g, '')
    .trim()
    .substring(0, 200); // Limit length
}
```

## Configuration Management

### Environment Variables

```bash
# Region Detection
DEFAULT_COUNTRY_CODE=US

# Booking Platforms
ZOCDOC_API_KEY=your_key_here
MARHAM_API_KEY=your_key_here
PRACTO_API_KEY=your_key_here
DOCTOLIB_API_KEY=your_key_here
HEALTHENGINE_API_KEY=your_key_here

# E-commerce Platforms
AMAZON_API_KEY=your_key_here
DAWAAI_API_KEY=your_key_here
ONEMG_API_KEY=your_key_here
CVS_API_KEY=your_key_here
CHEMIST_WAREHOUSE_API_KEY=your_key_here

# Web Search
SERPER_API_KEY=your_key_here
BRAVE_SEARCH_API_KEY=your_key_here

# Tool Configuration
TOOL_TIMEOUT_MS=10000
TOOL_MAX_RETRIES=2
TOOL_CACHE_ENABLED=true
```

### Platform Configuration File

**Location:** `src/config/platforms.config.js`

```javascript
module.exports = {
  booking: {
    zocdoc: {
      name: 'Zocdoc',
      countries: ['US'],
      apiEndpoint: 'https://api.zocdoc.com/v1',
      apiKey: process.env.ZOCDOC_API_KEY,
      enabled: !!process.env.ZOCDOC_API_KEY,
      rateLimit: 60
    },
    marham: {
      name: 'Marham',
      countries: ['PK'],
      apiEndpoint: 'https://api.marham.pk/v1',
      apiKey: process.env.MARHAM_API_KEY,
      enabled: !!process.env.MARHAM_API_KEY,
      rateLimit: 60
    }
    // ... more platforms
  },
  ecommerce: {
    // ... platform configs
  }
};
```

## Implementation Strategy

### Phase 1: Web Search Tool Implementation (Week 1)
- Implement Web Search Tool with Serper API
- Add Brave Search as fallback
- Implement caching layer
- Add error handling and retries
- Create tool schema for LangGraph

### Phase 2: Agent Integration (Week 2)
- Update Provider Matcher Agent to use web search tool
- Update Product Recommender Agent to use web search tool
- Update Next Steps Generator Agent (if needed)
- Implement intelligent query building
- Add URL extraction logic

### Phase 3: Testing and Optimization (Week 3)
- Test with multiple locations (US, Pakistan, India, UK, Australia)
- Verify dynamic URL discovery
- Optimize cache strategy
- Performance testing
- Documentation

## Monitoring and Observability

### Metrics to Track

1. **Web Search Tool Performance**
   - Average execution time
   - Success rate
   - Retry rate
   - Cache hit rate
   - Search API used (Serper vs Brave)

2. **URL Discovery Success**
   - Percentage of providers with booking URLs found
   - Percentage of products with purchase URLs found
   - Average number of search results used

3. **Regional Usage**
   - Requests per country
   - Success rate per country
   - Most common search queries per region

### Logging

```javascript
logger.info('Web search tool invocation', {
  query: 'book appointment Dr. Ahmed Khan cardiologist Lahore Pakistan',
  country: 'PK',
  searchEngine: 'serper',
  executionTimeMs: 456,
  resultsFound: 5,
  success: true,
  cached: false,
  retryCount: 0
});
```

## Future Enhancements

1. **Intelligent Query Optimization**
   - Learn which search queries work best for different types of providers/products
   - A/B test different query formulations

2. **Result Ranking**
   - Rank search results by relevance and trustworthiness
   - Prefer known healthcare/e-commerce domains

3. **Multi-Language Support**
   - Translate queries for regional searches
   - Support local languages in search results

4. **Image Extraction**
   - Extract product images from search results
   - Use image search for better product matching

5. **Structured Data Extraction**
   - Extract structured data (prices, ratings, availability) from search results
   - Use web scraping for richer information
