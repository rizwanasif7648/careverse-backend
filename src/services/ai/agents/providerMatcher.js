/**
 * Provider Matcher Agent
 * Finds relevant healthcare providers based on specialty and user location
 */

const { Op } = require('sequelize');
const { sequelize } = require('../../../config/database');
const Provider = require('../../../models/Provider');
const redisService = require('../../cache/redis.service');
const GooglePlacesService = require('../tools/googlePlaces');
const WebSearchTool = require('../tools/webSearchTool');
const logger = require('../../../config/logger');

class ProviderMatcherAgent {
  constructor() {
    this.googlePlaces = new GooglePlacesService();
    this.webSearchTool = new WebSearchTool();
    this.defaultRadius = 25; // miles
    this.expandedRadius = 50; // miles
    this.maxProviders = 10;
    this.minProvidersBeforeExpanding = 5;
    this.cacheEnabled = redisService.getStatus();
    this.cacheTTL = 3600; // 1 hour in seconds
  }

  /**
   * Find healthcare providers based on specialty and location
   * @param {Object} params - Search parameters
   * @param {string} params.specialty - Required medical specialty
   * @param {Object} params.location - User location {latitude, longitude, city, state}
   * @returns {Promise<Array>} Array of provider recommendations
   */
  async findProviders({ specialty, location }) {
    const startTime = Date.now();
    
    logger.info('ProviderMatcherAgent: Starting provider search', {
      specialty,
      location,
      startTime: new Date(startTime).toISOString()
    });

    try {
      // Validate inputs
      if (!specialty || !location || !location.latitude || !location.longitude) {
        logger.error('ProviderMatcherAgent: Invalid input parameters');
        return [];
      }

      // Check cache first
      const cacheStartTime = Date.now();
      const cachedProviders = await this.getCachedProviders(specialty, location);
      const cacheTime = Date.now() - cacheStartTime;
      
      if (cachedProviders) {
        const executionTime = Date.now() - startTime;
        
        logger.info('ProviderMatcherAgent: Returning cached providers', {
          count: cachedProviders.length,
          executionTimeMs: executionTime,
          cacheTimeMs: cacheTime,
          cacheHit: true
        });
        
        // Return with empty tool metrics since no web search was performed
        return {
          providers: cachedProviders,
          toolMetrics: {
            webSearchInvocations: 0,
            webSearchExecutionTimeMs: 0,
            webSearchCacheHits: 0,
            webSearchCacheMisses: 0,
            webSearchErrors: 0,
            webSearchRetries: 0
          }
        };
      }

      // Search database for providers
      const dbStartTime = Date.now();
      let providers = await this.searchDatabaseProviders(
        specialty,
        location,
        this.defaultRadius
      );
      const dbTime = Date.now() - dbStartTime;

      logger.info('ProviderMatcherAgent: Database search completed', {
        count: providers.length,
        radius: this.defaultRadius,
        dbSearchTimeMs: dbTime
      });

      // If insufficient results, expand search radius
      if (providers.length < this.minProvidersBeforeExpanding) {
        logger.info('ProviderMatcherAgent: Expanding search radius', {
          newRadius: this.expandedRadius
        });

        const expandedStartTime = Date.now();
        providers = await this.searchDatabaseProviders(
          specialty,
          location,
          this.expandedRadius
        );
        const expandedTime = Date.now() - expandedStartTime;
        
        logger.info('ProviderMatcherAgent: Expanded search completed', {
          count: providers.length,
          expandedSearchTimeMs: expandedTime
        });
      }

      // If still insufficient, query Google Places API
      let googleTime = 0;
      if (providers.length < this.minProvidersBeforeExpanding) {
        logger.info('ProviderMatcherAgent: Querying Google Places API');

        const googleStartTime = Date.now();
        const googleProviders = await this.googlePlaces.searchProviders({
          specialty,
          location: {
            lat: location.latitude,
            lng: location.longitude
          },
          radius: this.defaultRadius * 1609.34 // Convert miles to meters
        });
        googleTime = Date.now() - googleStartTime;

        // Merge results
        providers = this.mergeProviders(providers, googleProviders);
        
        logger.info('ProviderMatcherAgent: Google Places search completed', {
          googleProvidersFound: googleProviders.length,
          googleSearchTimeMs: googleTime
        });
      }

      // Enrich providers with booking links
      const enrichStartTime = Date.now();
      const enrichmentResult = await this.enrichProvidersWithBookingLinks(providers, location);
      providers = enrichmentResult.providers;
      const toolMetrics = enrichmentResult.toolMetrics;
      const enrichTime = Date.now() - enrichStartTime;

      // Rank and limit providers
      providers = this.rankAndLimitProviders(providers);

      // Cache results
      await this.cacheProviders(specialty, location, providers);

      const executionTime = Date.now() - startTime;

      logger.info('ProviderMatcherAgent: Provider search completed', {
        finalCount: providers.length,
        executionTimeMs: executionTime,
        cacheHit: false,
        performance: {
          cacheCheckMs: cacheTime,
          dbSearchMs: dbTime,
          googleSearchMs: googleTime,
          enrichmentMs: enrichTime
        },
        toolMetrics
      });

      return {
        providers,
        toolMetrics
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('ProviderMatcherAgent: Provider search failed', {
        error: error.message,
        stack: error.stack,
        executionTimeMs: executionTime
      });
      
      return {
        providers: [],
        toolMetrics: {
          webSearchInvocations: 0,
          webSearchExecutionTimeMs: 0,
          webSearchCacheHits: 0,
          webSearchCacheMisses: 0,
          webSearchErrors: 0,
          webSearchRetries: 0
        }
      };
    }
  }

  /**
   * Get cached providers from Redis
   * @param {string} specialty - Medical specialty
   * @param {Object} location - User location
   * @returns {Promise<Array|null>} Cached providers or null
   */
  async getCachedProviders(specialty, location) {
    try {
      if (!this.cacheEnabled) {
        logger.debug('ProviderMatcherAgent: Cache disabled, skipping cache lookup');
        return null;
      }

      const cacheKey = this.buildCacheKey(specialty, location);
      const cached = await redisService.get(cacheKey);

      if (cached) {
        logger.info('ProviderMatcherAgent: Cache hit', {
          cacheKey,
          specialty,
          location: `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`
        });
        return JSON.parse(cached);
      }

      logger.info('ProviderMatcherAgent: Cache miss', {
        cacheKey,
        specialty
      });

      return null;
    } catch (error) {
      logger.error('ProviderMatcherAgent: Cache retrieval failed', {
        error: error.message,
        specialty,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * Cache providers in Redis
   * @param {string} specialty - Medical specialty
   * @param {Object} location - User location
   * @param {Array} providers - Providers to cache
   * @returns {Promise<void>}
   */
  async cacheProviders(specialty, location, providers) {
    try {
      if (!this.cacheEnabled) {
        return;
      }

      const cacheKey = this.buildCacheKey(specialty, location);
      await redisService.setex(cacheKey, this.cacheTTL, JSON.stringify(providers));

      logger.debug('ProviderMatcherAgent: Providers cached', {
        cacheKey,
        count: providers.length
      });
    } catch (error) {
      logger.error('ProviderMatcherAgent: Cache storage failed', {
        error: error.message
      });
    }
  }

  /**
   * Build cache key for provider search
   * @param {string} specialty - Medical specialty
   * @param {Object} location - User location
   * @returns {string} Cache key
   */
  buildCacheKey(specialty, location) {
    const lat = location.latitude.toFixed(2);
    const lng = location.longitude.toFixed(2);
    const normalizedSpecialty = specialty.toLowerCase().replace(/\s+/g, '_');
    return `providers:${normalizedSpecialty}:${lat}:${lng}`;
  }

  /**
   * Search database for providers within radius
   * @param {string} specialty - Medical specialty
   * @param {Object} location - User location
   * @param {number} radiusMiles - Search radius in miles
   * @returns {Promise<Array>} Array of providers
   */
  async searchDatabaseProviders(specialty, location, radiusMiles) {
    try {
      const { latitude, longitude } = location;

      // Use Haversine formula to calculate distance
      const providers = await Provider.findAll({
        where: {
          specialty: {
            [Op.iLike]: `%${specialty}%`
          }
        },
        attributes: {
          include: [
            [
              sequelize.literal(`
                3958.8 * ACOS(
                  COS(RADIANS(${latitude})) * COS(RADIANS(latitude)) * 
                  COS(RADIANS(longitude) - RADIANS(${longitude})) + 
                  SIN(RADIANS(${latitude})) * SIN(RADIANS(latitude))
                )
              `),
              'distance_miles'
            ]
          ]
        },
        having: sequelize.where(
          sequelize.literal('distance_miles'),
          '<=',
          radiusMiles
        ),
        order: [[sequelize.literal('distance_miles'), 'ASC']],
        raw: true
      });

      // Format providers
      return providers.map(provider => this.formatDatabaseProvider(provider));
    } catch (error) {
      logger.error('ProviderMatcherAgent: Database search failed', {
        error: error.message,
        stack: error.stack
      });
      return [];
    }
  }

  /**
   * Format database provider to standard format
   * @param {Object} provider - Raw provider from database
   * @returns {Object} Formatted provider
   */
  formatDatabaseProvider(provider) {
    return {
      name: provider.name,
      specialty: provider.specialty,
      address: this.formatAddress(provider),
      phone: provider.phone || '',
      rating: provider.rating || 0,
      reviewCount: provider.reviewCount || 0,
      latitude: provider.latitude,
      longitude: provider.longitude,
      distance: provider.distance_miles ? provider.distance_miles.toFixed(1) : '0.0',
      distanceMiles: provider.distance_miles || 0,
      website: provider.website || null,
      profileUrl: provider.website || null,
      bookingUrl: null,
      source: 'database',
      isAcceptingNewPatients: provider.isAcceptingNewPatients
    };
  }

  /**
   * Format provider address
   * @param {Object} provider - Provider object
   * @returns {string} Formatted address
   */
  formatAddress(provider) {
    const parts = [];
    
    if (provider.address) parts.push(provider.address);
    if (provider.city) parts.push(provider.city);
    if (provider.state) parts.push(provider.state);
    if (provider.zipCode) parts.push(provider.zipCode);
    
    return parts.join(', ');
  }

  /**
   * Merge database and Google Places providers
   * @param {Array} dbProviders - Providers from database
   * @param {Array} googleProviders - Providers from Google Places
   * @returns {Array} Merged providers
   */
  mergeProviders(dbProviders, googleProviders) {
    // Create a map of database providers by name for deduplication
    const providerMap = new Map();
    
    dbProviders.forEach(provider => {
      const key = provider.name.toLowerCase().trim();
      providerMap.set(key, provider);
    });

    // Add Google providers if not already in database
    googleProviders.forEach(provider => {
      const key = provider.name.toLowerCase().trim();
      if (!providerMap.has(key)) {
        providerMap.set(key, provider);
      }
    });

    return Array.from(providerMap.values());
  }

  /**
   * Enrich providers with booking links using dynamic web search
   * @param {Array} providers - Providers to enrich
   * @param {Object} location - User location context
   * @returns {Promise<Object>} Object with enriched providers and tool metrics
   */
  async enrichProvidersWithBookingLinks(providers, location = {}) {
    const enrichStartTime = Date.now();
    
    logger.info('ProviderMatcherAgent: Starting booking link enrichment', {
      providerCount: providers.length,
      location: location.city || 'unknown'
    });

    // Initialize tool metrics
    const toolMetrics = {
      webSearchInvocations: 0,
      webSearchExecutionTimeMs: 0,
      webSearchCacheHits: 0,
      webSearchCacheMisses: 0,
      webSearchErrors: 0,
      webSearchRetries: 0
    };

    // Process providers in parallel with a limit to avoid overwhelming the API
    const enrichedProviders = await Promise.all(
      providers.map(async (provider) => {
        try {
          // Build search query for booking links
          const searchQuery = this.buildBookingSearchQuery(provider, location);
          
          logger.debug('ProviderMatcherAgent: Searching for booking link', {
            provider: provider.name,
            query: searchQuery
          });

          // Invoke web search tool
          toolMetrics.webSearchInvocations++;
          const searchResult = await this.webSearchTool.search({
            query: searchQuery,
            location: {
              country: location.country || location.countryName || 'US',
              city: location.city || '',
              countryCode: location.country || 'US'
            },
            maxResults: 3
          });

          // Track metrics from search result
          if (searchResult.metadata) {
            toolMetrics.webSearchExecutionTimeMs += searchResult.metadata.executionTimeMs || 0;
            
            if (searchResult.metadata.cached) {
              toolMetrics.webSearchCacheHits++;
            } else {
              toolMetrics.webSearchCacheMisses++;
            }
            
            toolMetrics.webSearchRetries += searchResult.metadata.retryCount || 0;
          }

          // Extract booking URL from search results
          if (searchResult.success && searchResult.results.length > 0) {
            const bookingUrl = this.extractBookingUrl(searchResult.results);
            
            if (bookingUrl) {
              provider.bookingUrl = bookingUrl;
              provider.profileUrl = searchResult.results[0].url;
              
              logger.debug('ProviderMatcherAgent: Booking link found', {
                provider: provider.name,
                bookingUrl: bookingUrl
              });
            } else {
              // Fallback to provider website
              provider.bookingUrl = provider.website || null;
              provider.profileUrl = provider.website || null;
              
              logger.debug('ProviderMatcherAgent: No booking link found, using website', {
                provider: provider.name,
                website: provider.website
              });
            }
          } else {
            // Track error if search failed
            if (!searchResult.success) {
              toolMetrics.webSearchErrors++;
            }
            
            // Fallback to provider website if search fails
            provider.bookingUrl = provider.website || null;
            provider.profileUrl = provider.website || null;
            
            logger.debug('ProviderMatcherAgent: Web search failed, using website', {
              provider: provider.name,
              website: provider.website
            });
          }
        } catch (error) {
          toolMetrics.webSearchErrors++;
          
          logger.error('ProviderMatcherAgent: Error enriching provider', {
            provider: provider.name,
            error: error.message
          });
          
          // Fallback to provider website on error
          provider.bookingUrl = provider.website || null;
          provider.profileUrl = provider.website || null;
        }

        return provider;
      })
    );

    const enrichTime = Date.now() - enrichStartTime;
    
    logger.info('ProviderMatcherAgent: Booking link enrichment completed', {
      providerCount: enrichedProviders.length,
      enrichmentTimeMs: enrichTime,
      toolMetrics
    });

    return {
      providers: enrichedProviders,
      toolMetrics
    };
  }

  /**
   * Build search query for finding provider booking links
   * @param {Object} provider - Provider object
   * @param {Object} location - User location
   * @returns {string} Search query
   */
  buildBookingSearchQuery(provider, location) {
    const parts = ['book appointment'];
    
    if (provider.name) {
      parts.push(provider.name);
    }
    
    if (provider.specialty) {
      parts.push(provider.specialty);
    }
    
    if (location.city) {
      parts.push(location.city);
    }
    
    if (location.country || location.countryName) {
      parts.push(location.country || location.countryName);
    }
    
    return parts.join(' ');
  }

  /**
   * Extract booking URL from search results
   * @param {Array} results - Search results
   * @returns {string|null} Booking URL or null
   */
  extractBookingUrl(results) {
    if (!results || results.length === 0) {
      return null;
    }

    // Look for URLs that contain booking-related keywords
    const bookingKeywords = [
      'book', 'appointment', 'schedule', 'booking',
      'zocdoc', 'practo', 'marham', 'doctolib', 'healthengine',
      'oladoc', 'doctoruna', 'doctoralia'
    ];

    // First, try to find a result with booking keywords in the URL or title
    for (const result of results) {
      const urlLower = result.url.toLowerCase();
      const titleLower = result.title.toLowerCase();
      
      const hasBookingKeyword = bookingKeywords.some(keyword => 
        urlLower.includes(keyword) || titleLower.includes(keyword)
      );
      
      if (hasBookingKeyword) {
        return result.url;
      }
    }

    // If no booking-specific URL found, return the first result
    return results[0].url;
  }

  /**
   * Rank and limit providers
   * @param {Array} providers - Providers to rank
   * @returns {Array} Ranked and limited providers
   */
  rankAndLimitProviders(providers) {
    // Sort by distance first, then by rating
    const sorted = providers.sort((a, b) => {
      // Primary sort: distance
      const distanceDiff = a.distanceMiles - b.distanceMiles;
      if (Math.abs(distanceDiff) > 0.1) {
        return distanceDiff;
      }
      
      // Secondary sort: rating (descending)
      return b.rating - a.rating;
    });

    // Limit to max providers
    const limited = sorted.slice(0, this.maxProviders);

    // Format distance for display
    return limited.map(provider => ({
      ...provider,
      distance: `${provider.distance} miles away`
    }));
  }
}

module.exports = ProviderMatcherAgent;
