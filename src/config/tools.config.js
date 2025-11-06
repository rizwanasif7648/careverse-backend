const config = require('./config');

/**
 * Tool Configuration
 * Centralized configuration for AI agent tools including web search, 
 * location services, and other external integrations
 */

module.exports = {
  /**
   * Web Search Tool Configuration
   * Used for dynamic discovery of booking links, product URLs, and health resources
   */
  webSearch: {
    // API Keys
    serperApiKey: config.webSearch.serperApiKey,
    braveApiKey: config.webSearch.braveApiKey,
    
    // Primary search engine (serper or brave)
    primaryEngine: config.webSearch.serperApiKey ? 'serper' : 'brave',
    
    // Fallback search engine
    fallbackEngine: config.webSearch.braveApiKey ? 'brave' : null,
    
    // Request Configuration
    timeoutMs: config.webSearch.timeoutMs,
    maxRetries: config.webSearch.maxRetries,
    retryDelayMs: 1000, // Initial retry delay (exponential backoff)
    
    // Result Configuration
    maxResults: config.webSearch.maxResults,
    minResults: 1, // Minimum results to consider search successful
    
    // Cache Configuration
    cacheEnabled: config.webSearch.cacheEnabled,
    cacheTtlSeconds: config.webSearch.cacheTtlHours * 3600,
    cacheKeyPrefix: 'web_search',
    
    // API Endpoints
    endpoints: {
      serper: 'https://google.serper.dev/search',
      brave: 'https://api.search.brave.com/res/v1/web/search'
    },
    
    // Rate Limiting (requests per minute)
    rateLimit: {
      serper: 60,
      brave: 60
    },
    
    // Query Building
    queryConfig: {
      maxQueryLength: 200,
      includeLocation: true,
      locationFormat: '{city}, {country}' // Template for location in queries
    },
    
    // URL Validation
    urlValidation: {
      requireHttps: false, // Allow HTTP for some local platforms
      blacklistedProtocols: ['javascript:', 'data:', 'file:'],
      blacklistedDomains: ['localhost', '127.0.0.1'],
      maxUrlLength: 2048
    },
    
    // Search Result Filtering
    resultFiltering: {
      excludePatterns: [
        'wikipedia.org', // Exclude informational sites for booking/product searches
        'youtube.com',
        'facebook.com',
        'twitter.com',
        'instagram.com'
      ],
      preferredDomains: {
        booking: [], // Will be populated dynamically based on location
        products: []
      }
    }
  },

  /**
   * Google Places Tool Configuration
   * Used for finding healthcare providers
   */
  googlePlaces: {
    apiKey: config.googlePlaces.apiKey,
    enabled: !!config.googlePlaces.apiKey,
    timeoutMs: 10000,
    maxRetries: 2,
    cacheEnabled: true,
    cacheTtlSeconds: 3600, // 1 hour
    maxResults: 20
  },

  /**
   * Tool Registry Configuration
   * Global settings for tool management
   */
  registry: {
    // Enable/disable all tools
    enabled: true,
    
    // Default timeout for all tools
    defaultTimeoutMs: 10000,
    
    // Default retry configuration
    defaultMaxRetries: 2,
    
    // Logging
    logToolInvocations: config.NODE_ENV === 'development',
    logToolErrors: true,
    
    // Performance tracking
    trackPerformance: true,
    performanceMetrics: {
      executionTime: true,
      successRate: true,
      cacheHitRate: true,
      retryCount: true
    }
  },

  /**
   * Location-Aware Configuration
   * Settings for location-based tool behavior
   */
  location: {
    // Default country code when location is not provided
    defaultCountryCode: 'US',
    
    // Country code to search engine locale mapping
    localeMapping: {
      'US': 'en-US',
      'GB': 'en-GB',
      'PK': 'en-PK',
      'IN': 'en-IN',
      'AU': 'en-AU',
      'CA': 'en-CA'
    },
    
    // Enable location-based result filtering
    enableLocationFiltering: true
  }
};
