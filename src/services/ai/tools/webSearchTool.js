/**
 * Web Search Tool
 * Performs intelligent web searches to find location-specific booking links,
 * product URLs, and provider information using Serper API and Brave Search
 */

const axios = require('axios');
const config = require('../../../config/config');
const toolsConfig = require('../../../config/tools.config');
const logger = require('../../../config/logger');
const redisService = require('../../cache/redis.service');

class WebSearchTool {
  constructor() {
    this.serperApiKey = config.webSearch.serperApiKey;
    this.braveApiKey = config.webSearch.braveApiKey;
    this.timeoutMs = toolsConfig.webSearch.timeoutMs;
    this.maxRetries = toolsConfig.webSearch.maxRetries;
    this.maxResults = toolsConfig.webSearch.maxResults;
    this.cacheEnabled = toolsConfig.webSearch.cacheEnabled;
    this.cacheTtlSeconds = toolsConfig.webSearch.cacheTtlSeconds;
    this.cacheKeyPrefix = toolsConfig.webSearch.cacheKeyPrefix;
    
    // Determine primary and fallback search engines
    this.primaryEngine = toolsConfig.webSearch.primaryEngine;
    this.fallbackEngine = toolsConfig.webSearch.fallbackEngine;
    
    // API endpoints
    this.serperEndpoint = toolsConfig.webSearch.endpoints.serper;
    this.braveEndpoint = toolsConfig.webSearch.endpoints.brave;
  }

  /**
   * Perform location-aware web search
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search query
   * @param {Object} params.location - User location {country, city, countryCode}
   * @param {number} params.maxResults - Maximum results (default: 5)
   * @returns {Promise<Object>} Search results with URLs and snippets
   */
  async search(params) {
    const { query, location, maxResults = this.maxResults } = params;
    
    if (!query || !location) {
      logger.error('WebSearchTool: Missing required parameters', { query, location });
      return this.createErrorResponse('Missing required parameters', query, location);
    }

    const startTime = Date.now();
    const countryCode = location.countryCode || location.country || 'US';
    
    // Build location-aware query
    const enhancedQuery = this.buildLocationQuery(query, location);
    
    logger.info('WebSearchTool: Starting search', {
      originalQuery: query,
      enhancedQuery,
      location: countryCode,
      city: location.city,
      maxResults
    });

    // Check cache first
    let cacheHit = false;
    if (this.cacheEnabled) {
      const cachedResults = await this.getCachedResults(enhancedQuery, countryCode);
      if (cachedResults) {
        cacheHit = true;
        const executionTimeMs = Date.now() - startTime;
        
        logger.info('WebSearchTool: Cache hit', {
          query: enhancedQuery,
          location: countryCode,
          executionTimeMs,
          resultsCount: cachedResults.results?.length || 0,
          searchEngine: cachedResults.metadata?.searchEngine
        });
        
        return cachedResults;
      } else {
        logger.info('WebSearchTool: Cache miss', {
          query: enhancedQuery,
          location: countryCode
        });
      }
    }

    // Perform search with retry logic
    let searchResults = null;
    let searchEngine = null;
    let retryCount = 0;
    let primaryEngineFailed = false;

    try {
      // Try primary search engine
      if (this.primaryEngine === 'serper' && this.serperApiKey) {
        const result = await this.searchWithRetry(
          () => this.searchWithSerper(enhancedQuery, countryCode, maxResults),
          'serper'
        );
        searchResults = result.results;
        retryCount = result.retryCount;
        searchEngine = 'serper';
      } else if (this.primaryEngine === 'brave' && this.braveApiKey) {
        const result = await this.searchWithRetry(
          () => this.searchWithBrave(enhancedQuery, countryCode, maxResults),
          'brave'
        );
        searchResults = result.results;
        retryCount = result.retryCount;
        searchEngine = 'brave';
      }
    } catch (primaryError) {
      primaryEngineFailed = true;
      
      logger.warn('WebSearchTool: Primary search engine failed', {
        engine: this.primaryEngine,
        error: primaryError.message,
        query: enhancedQuery,
        location: countryCode
      });

      // Try fallback search engine
      if (this.fallbackEngine && this.fallbackEngine !== this.primaryEngine) {
        try {
          if (this.fallbackEngine === 'brave' && this.braveApiKey) {
            const result = await this.searchWithRetry(
              () => this.searchWithBrave(enhancedQuery, countryCode, maxResults),
              'brave'
            );
            searchResults = result.results;
            retryCount = result.retryCount;
            searchEngine = 'brave';
            
            logger.info('WebSearchTool: Fallback search engine succeeded', {
              engine: this.fallbackEngine,
              query: enhancedQuery,
              location: countryCode,
              retryCount
            });
          } else if (this.fallbackEngine === 'serper' && this.serperApiKey) {
            const result = await this.searchWithRetry(
              () => this.searchWithSerper(enhancedQuery, countryCode, maxResults),
              'serper'
            );
            searchResults = result.results;
            retryCount = result.retryCount;
            searchEngine = 'serper';
            
            logger.info('WebSearchTool: Fallback search engine succeeded', {
              engine: this.fallbackEngine,
              query: enhancedQuery,
              location: countryCode,
              retryCount
            });
          }
        } catch (fallbackError) {
          logger.error('WebSearchTool: Fallback search engine also failed', {
            engine: this.fallbackEngine,
            error: fallbackError.message,
            query: enhancedQuery,
            location: countryCode
          });
        }
      }
    }

    const executionTimeMs = Date.now() - startTime;

    // Handle search failure
    if (!searchResults || searchResults.length === 0) {
      logger.error('WebSearchTool: All search attempts failed', {
        query: enhancedQuery,
        location: countryCode,
        executionTimeMs,
        primaryEngineFailed,
        fallbackAttempted: primaryEngineFailed && !!this.fallbackEngine
      });
      
      return this.createErrorResponse('All search attempts failed', enhancedQuery, countryCode, executionTimeMs, retryCount);
    }

    // Format and validate results
    const formattedResults = this.formatResults(searchResults);
    
    const response = {
      success: true,
      results: formattedResults,
      metadata: {
        query: enhancedQuery,
        originalQuery: query,
        location: countryCode,
        executionTimeMs,
        cached: false,
        searchEngine,
        retryCount,
        primaryEngineFailed
      }
    };

    // Cache results
    if (this.cacheEnabled) {
      await this.cacheResults(enhancedQuery, countryCode, response);
    }

    logger.info('WebSearchTool: Search completed successfully', {
      query: enhancedQuery,
      location: countryCode,
      resultsCount: formattedResults.length,
      executionTimeMs,
      searchEngine,
      retryCount,
      cached: false,
      primaryEngineFailed
    });

    return response;
  }

  /**
   * Build location-aware search query
   * @param {string} baseQuery - Base search query
   * @param {Object} location - User location
   * @returns {string} Enhanced query with location context
   */
  buildLocationQuery(baseQuery, location) {
    // If query already contains location info, return as is
    if (baseQuery.toLowerCase().includes(location.city?.toLowerCase()) ||
        baseQuery.toLowerCase().includes(location.country?.toLowerCase())) {
      return baseQuery;
    }

    // Add location context to query
    const locationParts = [];
    if (location.city) locationParts.push(location.city);
    if (location.country) locationParts.push(location.country);
    
    if (locationParts.length > 0) {
      return `${baseQuery} ${locationParts.join(' ')}`;
    }

    return baseQuery;
  }

  /**
   * Search using Serper API (primary)
   * @param {string} query - Search query
   * @param {string} countryCode - ISO country code for localized results
   * @param {number} maxResults - Maximum results
   * @returns {Promise<Array>} Search results
   */
  async searchWithSerper(query, countryCode, maxResults) {
    if (!this.serperApiKey) {
      throw new Error('Serper API key not configured');
    }

    logger.debug('WebSearchTool: Searching with Serper', { query, countryCode });

    const response = await axios.post(
      this.serperEndpoint,
      {
        q: query,
        gl: countryCode.toLowerCase(),
        num: maxResults
      },
      {
        headers: {
          'X-API-KEY': this.serperApiKey,
          'Content-Type': 'application/json'
        },
        timeout: this.timeoutMs
      }
    );

    if (!response.data || !response.data.organic) {
      throw new Error('Invalid Serper API response');
    }

    return response.data.organic;
  }

  /**
   * Search using Brave Search API (fallback)
   * @param {string} query - Search query
   * @param {string} countryCode - ISO country code
   * @param {number} maxResults - Maximum results
   * @returns {Promise<Array>} Search results
   */
  async searchWithBrave(query, countryCode, maxResults) {
    if (!this.braveApiKey) {
      throw new Error('Brave Search API key not configured');
    }

    logger.debug('WebSearchTool: Searching with Brave', { query, countryCode });

    const response = await axios.get(this.braveEndpoint, {
      params: {
        q: query,
        country: countryCode.toLowerCase(),
        count: maxResults
      },
      headers: {
        'X-Subscription-Token': this.braveApiKey,
        'Accept': 'application/json'
      },
      timeout: this.timeoutMs
    });

    if (!response.data || !response.data.web || !response.data.web.results) {
      throw new Error('Invalid Brave Search API response');
    }

    return response.data.web.results;
  }

  /**
   * Search with retry logic
   * @param {Function} searchFn - Search function to execute
   * @param {string} engineName - Name of search engine
   * @returns {Promise<Object>} Search results with retry count
   */
  async searchWithRetry(searchFn, engineName) {
    let lastError = null;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          logger.info(`WebSearchTool: Retrying ${engineName} search (attempt ${attempt + 1}/${this.maxRetries + 1})`, { 
            delay,
            engineName
          });
          await this.sleep(delay);
        }
        
        const results = await searchFn();
        
        if (attempt > 0) {
          logger.info(`WebSearchTool: ${engineName} search succeeded after retry`, {
            engineName,
            attemptNumber: attempt + 1,
            totalAttempts: this.maxRetries + 1
          });
        }
        
        return {
          results,
          retryCount: attempt
        };
      } catch (error) {
        lastError = error;
        logger.warn(`WebSearchTool: ${engineName} search attempt ${attempt + 1}/${this.maxRetries + 1} failed`, {
          engineName,
          error: error.message,
          attemptNumber: attempt + 1
        });
      }
    }
    
    logger.error(`WebSearchTool: ${engineName} search failed after all retry attempts`, {
      engineName,
      totalAttempts: this.maxRetries + 1,
      finalError: lastError.message
    });
    
    throw lastError;
  }

  /**
   * Format search results for agent consumption
   * @param {Array} rawResults - Raw search results
   * @returns {Array} Formatted results
   */
  formatResults(rawResults) {
    return rawResults
      .map((result, index) => ({
        title: result.title || '',
        url: result.link || result.url || '',
        snippet: result.snippet || result.description || '',
        position: index + 1
      }))
      .filter(result => this.validateUrl(result.url))
      .slice(0, this.maxResults);
  }

  /**
   * Validate URL
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid
   */
  validateUrl(url) {
    if (!url) return false;

    try {
      const parsedUrl = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return false;
      }
      
      // Check for blacklisted protocols and domains
      const blacklistedProtocols = toolsConfig.webSearch.urlValidation.blacklistedProtocols;
      const blacklistedDomains = toolsConfig.webSearch.urlValidation.blacklistedDomains;
      
      if (blacklistedProtocols.some(protocol => url.toLowerCase().startsWith(protocol))) {
        return false;
      }
      
      if (blacklistedDomains.some(domain => parsedUrl.hostname.includes(domain))) {
        return false;
      }
      
      // Check URL length
      if (url.length > toolsConfig.webSearch.urlValidation.maxUrlLength) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cached search results
   * @param {string} query - Search query
   * @param {string} countryCode - Country code
   * @returns {Promise<Object|null>} Cached results or null
   */
  async getCachedResults(query, countryCode) {
    try {
      const cacheKey = this.buildCacheKey(query, countryCode);
      const cached = await redisService.get(cacheKey);
      
      if (cached) {
        const parsedResults = JSON.parse(cached);
        parsedResults.metadata.cached = true;
        return parsedResults;
      }
      
      return null;
    } catch (error) {
      logger.warn('WebSearchTool: Cache retrieval failed', { error: error.message });
      return null;
    }
  }

  /**
   * Cache search results
   * @param {string} query - Search query
   * @param {string} countryCode - Country code
   * @param {Object} results - Search results to cache
   * @returns {Promise<void>}
   */
  async cacheResults(query, countryCode, results) {
    try {
      const cacheKey = this.buildCacheKey(query, countryCode);
      await redisService.set(cacheKey, JSON.stringify(results), this.cacheTtlSeconds);
    } catch (error) {
      logger.warn('WebSearchTool: Cache storage failed', { error: error.message });
    }
  }

  /**
   * Build cache key
   * @param {string} query - Search query
   * @param {string} countryCode - Country code
   * @returns {string} Cache key
   */
  buildCacheKey(query, countryCode) {
    const queryHash = this.hashString(query);
    return `${this.cacheKeyPrefix}:${countryCode}:${queryHash}`;
  }

  /**
   * Simple string hash function
   * @param {string} str - String to hash
   * @returns {string} Hash
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Create error response
   * @param {string} message - Error message
   * @param {string} query - Search query
   * @param {string} location - Location
   * @param {number} executionTimeMs - Execution time
   * @param {number} retryCount - Number of retries attempted
   * @returns {Object} Error response
   */
  createErrorResponse(message, query, location, executionTimeMs = 0, retryCount = 0) {
    return {
      success: false,
      results: [],
      metadata: {
        query,
        location,
        executionTimeMs,
        cached: false,
        searchEngine: null,
        retryCount
      },
      error: {
        code: 'SEARCH_FAILED',
        message
      }
    };
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = WebSearchTool;
