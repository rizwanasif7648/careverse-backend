# Implementation Plan

- [x] 1. Set up web search API configuration
  - Add Serper API and Brave Search API keys to environment variables
  - Create tool configuration file for web search settings
  - Add timeout, retry, and cache settings
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 2. Implement Web Search Tool
  - Create WebSearchTool class with Serper API integration
  - Implement Brave Search as fallback
  - Add location-aware query building
  - Implement result parsing and URL extraction
  - Add caching layer with location-based cache keys
  - Implement error handling and retry logic
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2.1 Create WebSearchTool class structure
  - Write src/services/ai/tools/webSearchTool.js
  - Initialize with Serper and Brave Search configurations
  - Create main search method that accepts query and location
  - _Requirements: 5.1, 5.2_

- [x] 2.2 Implement Serper API integration
  - Create searchWithSerper method
  - Build API request with query and location parameters
  - Parse Serper API response format
  - Extract URLs, titles, and snippets from results
  - Handle API errors and rate limits
  - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2_

- [x] 2.3 Implement Brave Search API integration as fallback
  - Create searchWithBrave method
  - Build API request with query and location parameters
  - Parse Brave Search API response format
  - Extract URLs, titles, and snippets from results
  - _Requirements: 5.1, 5.2, 6.1, 6.2_

- [x] 2.4 Implement intelligent query building
  - Create buildLocationQuery method
  - Enhance base queries with location context (city, country)
  - Format queries for optimal search results
  - Handle special characters and encoding
  - _Requirements: 5.2, 5.3_

- [x] 2.5 Implement result parsing and validation
  - Create extractUrls method to validate URLs
  - Filter out invalid or suspicious URLs
  - Format results with title, url, snippet, position
  - Limit results to maxResults parameter
  - _Requirements: 5.3, 7.1, 7.2, 7.3, 7.4_

- [x] 2.6 Implement caching layer
  - Create location-aware cache key format
  - Cache search results in Redis with TTL
  - Check cache before making API calls
  - Handle cache misses and errors gracefully
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2.7 Implement error handling and retry logic
  - Add try-catch blocks for API calls
  - Implement exponential backoff retry (up to 2 retries)
  - Fall back from Serper to Brave on failure
  - Log errors with context
  - Return empty results on complete failure
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Create LangGraph tool schema and binding
  - Define web_search tool schema for LangGraph
  - Create tool binding utility
  - Add tool description and parameter definitions
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3.1 Define LangGraph tool schema
  - Create web search tool schema with name, description, parameters
  - Define query parameter (required)
  - Define location parameter with country, city, countryCode
  - Define maxResults parameter (optional, default 5)
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3.2 Create tool binding utility
  - Write src/services/ai/tools/toolRegistry.js
  - Implement method to bind web search tool to agents
  - Create tool wrapper that agents can invoke
  - _Requirements: 2.4, 2.5_

- [x] 4. Update Provider Matcher Agent
  - Bind web search tool to agent
  - Replace hardcoded booking URL logic with dynamic web search
  - Implement intelligent search query construction
  - Extract booking URLs from search results
  - Update enrichProvidersWithBookingLinks method
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4.1 Bind web search tool to Provider Matcher Agent
  - Import WebSearchTool in providerMatcher.js
  - Initialize tool in constructor
  - Make tool available to agent methods
  - _Requirements: 2.4, 2.5, 3.1_

- [x] 4.2 Implement dynamic booking URL search
  - Update enrichProvidersWithBookingLinks method
  - Build search query: "book appointment [provider] [specialty] [city] [country]"
  - Invoke web search tool with query and location
  - Extract booking URL from first search result
  - Fall back to provider website if search fails
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4.3 Remove hardcoded Zocdoc URL logic
  - Remove hardcoded Zocdoc URL construction
  - Remove platform-specific logic
  - Keep only dynamic web search approach
  - _Requirements: 3.1, 3.2_

- [x] 5. Update Product Recommender Agent
  - Bind web search tool to agent
  - Replace static product URLs with dynamic web search
  - Implement intelligent product search queries
  - Extract purchase URLs from search results
  - Update enrichProductLinks method
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 5.1 Bind web search tool to Product Recommender Agent
  - Import WebSearchTool in productRecommender.js
  - Initialize tool in constructor
  - Make tool available to agent methods
  - _Requirements: 2.4, 2.5, 4.1_

- [x] 5.2 Update product search service to use web search
  - Modify src/services/ai/tools/productSearch.js
  - Replace Amazon API placeholder with web search tool
  - Build search query: "buy [product] online [city] [country]"
  - Invoke web search tool with query and location
  - Extract purchase URL from search results
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 5.3 Remove hardcoded e-commerce platform logic
  - Remove Amazon-specific URL generation
  - Remove platform-specific methods (1mg, CVS, Walgreens)
  - Keep only dynamic web search approach
  - _Requirements: 4.1, 4.2_

- [x] 6. Update Next Steps Generator Agent (if needed)
  - Review current next steps generation logic
  - Add web search tool if needed for dynamic resource URLs
  - Ensure next step URLs are location-aware
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 6.1 Review Next Steps Generator implementation
  - Check if next steps already use dynamic URLs
  - Identify any hardcoded URLs that need to be made dynamic
  - _Requirements: 6.1, 6.2_

- [x] 6.2 Add web search tool if needed
  - Bind web search tool to Next Steps Generator if required
  - Use tool to find location-specific health resources
  - Update URL generation to use search results
  - _Requirements: 6.3, 6.4, 6.5, 6.6_

- [x] 7. Update agent prompts for tool usage
  - Update Provider Matcher prompt with web search instructions
  - Update Product Recommender prompt with web search instructions
  - Add examples of when to use web search tool
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 7.1 Update Provider Matcher prompt
  - Add instructions for using web search to find booking links
  - Specify query format for provider searches
  - Add examples of good search queries
  - Update src/services/ai/prompts/providerMatcher.js (if exists) or agent code
  - _Requirements: 10.1, 10.4, 10.5_

- [x] 7.2 Update Product Recommender prompt
  - Add instructions for using web search to find product URLs
  - Specify query format for product searches
  - Add examples of good search queries
  - Update src/services/ai/prompts/productRecommendation.js
  - _Requirements: 10.2, 10.4, 10.5_

- [x] 7.3 Update Next Steps Generator prompt (if needed)
  - Add instructions for using web search for health resources
  - Specify when to use web search vs existing data
  - Update src/services/ai/prompts/nextStepsGeneration.js
  - _Requirements: 10.3, 10.4, 10.5_

                                                                                                                                                                        - [x] 8. Add performance monitoring and logging
  - Add logging for web search tool invocations
  - Track execution time, success rate, cache hits
  - Log search queries and results count
  - Add metrics to assessment response metadata
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 8.1 Add web search tool logging
  - Log each search query with location context
  - Log search engine used (Serper vs Brave)
  - Log execution time and results count
  - Log cache hits and misses
  - Log errors and retry attempts
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 8.2 Add tool metrics to assessment metadata
  - Track total web search invocations per assessment
  - Track total web search execution time
  - Track cache hit rate
  - Include in assessment response metadata
  - _Requirements: 11.5_

- [x] 9. Testing and validation
  - Test web search tool with multiple locations
  - Test Provider Matcher with dynamic booking URLs
  - Test Product Recommender with dynamic purchase URLs
  - Verify assessment response structure unchanged
  - Test error handling and fallbacks
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 9.1 Test web search tool independently
  - Test Serper API integration with sample queries
  - Test Brave Search fallback
  - Test location-aware query building
  - Test caching behavior
  - Test error handling and retries
  - _Requirements: 12.1, 12.2_

- [x] 9.2 Test Provider Matcher with multiple locations
  - Test with US location (should find US booking platforms)
  - Test with Pakistan location (should find Pakistani platforms)
  - Test with India location (should find Indian platforms)
  - Test with UK location (should find UK platforms)
  - Test with Australia location (should find Australian platforms)
  - Verify booking URLs are valid and location-appropriate
  - _Requirements: 12.3, 12.4_

- [x] 9.3 Test Product Recommender with multiple locations
  - Test with US location (should find US e-commerce sites)
  - Test with Pakistan location (should find Pakistani sites)
  - Test with India location (should find Indian sites)
  - Verify purchase URLs are valid and location-appropriate
  - _Requirements: 12.3, 12.4_

- [x] 9.4 Test complete assessment flow
  - Generate assessment with US user location
  - Generate assessment with Pakistan user location
  - Generate assessment with India user location
  - Verify response structure is unchanged
  - Verify URLs are dynamic and location-specific
  - Verify assessment saves correctly to database
  - _Requirements: 12.5_

- [x] 9.5 Test error scenarios
  - Test with Serper API failure (should fall back to Brave)
  - Test with both APIs failing (should use fallback URLs)
  - Test with invalid location data
  - Test with missing API keys
  - Verify graceful degradation
  - _Requirements: 12.4, 12.5_

- [x] 10. Documentation and deployment
  - Update API documentation with web search tool details
  - Document new environment variables
  - Update README with setup instructions
  - Create migration guide from old to new system
  - _Requirements: All_

- [x] 10.1 Update environment configuration documentation
  - Document SERPER_API_KEY requirement
  - Document BRAVE_SEARCH_API_KEY as optional fallback
  - Document web search configuration options
  - Update .env.example file
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 10.2 Update API documentation
  - Document that URLs are now dynamically discovered
  - Explain location-aware URL generation
  - Note that response structure remains unchanged
  - Update API_DOCUMENTATION.md
  - _Requirements: All_

- [x] 10.3 Create setup guide for web search APIs
  - Document how to get Serper API key
  - Document how to get Brave Search API key (optional)
  - Add troubleshooting section
  - Update README.md
  - _Requirements: 9.1, 9.2_
