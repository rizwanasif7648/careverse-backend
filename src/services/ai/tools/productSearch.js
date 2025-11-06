/**
 * Product Search Service
 * Enriches product recommendations with purchase links using dynamic web search
 */

const logger = require('../../../config/logger');

class ProductSearchService {
  constructor() {
    this.searchTimeout = 5000; // 5 second timeout
  }

  /**
   * Enrich products with purchase links and images using web search
   * @param {Array} products - Products to enrich
   * @param {Object} location - User location context
   * @param {Object} webSearchTool - Web search tool instance
   * @returns {Promise<Object>} Object with enriched products and tool metrics
   */
  async enrichProducts(products, location = null, webSearchTool = null) {
    logger.info('ProductSearchService: Enriching products with web search', {
      productCount: products.length,
      location: location?.country || 'unknown',
      hasWebSearchTool: !!webSearchTool
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

    try {
      // If no web search tool or location, return products with fallback URLs
      if (!webSearchTool || !location) {
        logger.warn('ProductSearchService: Missing web search tool or location, using fallback URLs');
        return {
          products: products.map(product => ({
            ...product,
            purchaseUrl: this.generateFallbackUrl(product.name),
            imageUrl: null
          })),
          toolMetrics
        };
      }

      // Enrich products in parallel
      const enrichmentResults = await Promise.all(
        products.map(product => this.enrichSingleProduct(product, location, webSearchTool))
      );

      // Aggregate tool metrics from all product enrichments
      enrichmentResults.forEach(result => {
        if (result.metrics) {
          toolMetrics.webSearchInvocations += result.metrics.webSearchInvocations || 0;
          toolMetrics.webSearchExecutionTimeMs += result.metrics.webSearchExecutionTimeMs || 0;
          toolMetrics.webSearchCacheHits += result.metrics.webSearchCacheHits || 0;
          toolMetrics.webSearchCacheMisses += result.metrics.webSearchCacheMisses || 0;
          toolMetrics.webSearchErrors += result.metrics.webSearchErrors || 0;
          toolMetrics.webSearchRetries += result.metrics.webSearchRetries || 0;
        }
      });

      const enrichedProducts = enrichmentResults.map(result => result.product);

      logger.info('ProductSearchService: Products enriched', {
        successCount: enrichedProducts.filter(p => p.purchaseUrl).length,
        toolMetrics
      });

      return {
        products: enrichedProducts,
        toolMetrics
      };
    } catch (error) {
      logger.error('ProductSearchService: Failed to enrich products', {
        error: error.message
      });
      
      // Return original products with fallback URLs if enrichment fails
      return {
        products: products.map(product => ({
          ...product,
          purchaseUrl: this.generateFallbackUrl(product.name),
          imageUrl: null
        })),
        toolMetrics
      };
    }
  }

  /**
   * Enrich a single product with purchase link using web search
   * @param {Object} product - Product to enrich
   * @param {Object} location - User location context
   * @param {Object} webSearchTool - Web search tool instance
   * @returns {Promise<Object>} Object with enriched product and metrics
   */
  async enrichSingleProduct(product, location, webSearchTool) {
    const metrics = {
      webSearchInvocations: 0,
      webSearchExecutionTimeMs: 0,
      webSearchCacheHits: 0,
      webSearchCacheMisses: 0,
      webSearchErrors: 0,
      webSearchRetries: 0
    };

    try {
      // Build location-aware search query
      const searchQuery = this.buildProductSearchQuery(product.name, location);
      
      logger.debug('ProductSearchService: Searching for product', {
        productName: product.name,
        searchQuery,
        location: location.country
      });

      // Perform web search
      metrics.webSearchInvocations++;
      const searchResults = await webSearchTool.search({
        query: searchQuery,
        location: {
          country: location.country || location.countryName,
          city: location.city,
          countryCode: location.country
        },
        maxResults: 3
      });

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

      // Extract purchase URL from search results
      if (searchResults.success && searchResults.results.length > 0) {
        const purchaseUrl = this.extractPurchaseUrl(searchResults.results);
        
        logger.debug('ProductSearchService: Found purchase URL', {
          productName: product.name,
          purchaseUrl,
          resultsCount: searchResults.results.length
        });

        return {
          product: {
            ...product,
            purchaseUrl: purchaseUrl || this.generateFallbackUrl(product.name),
            imageUrl: null // Images can be added in future enhancement
          },
          metrics
        };
      }

      // Track error if search failed
      if (!searchResults.success) {
        metrics.webSearchErrors++;
      }

      // Fallback: Generate generic search URL
      logger.debug('ProductSearchService: No search results, using fallback URL', {
        productName: product.name
      });

      return {
        product: {
          ...product,
          purchaseUrl: this.generateFallbackUrl(product.name),
          imageUrl: null
        },
        metrics
      };
    } catch (error) {
      metrics.webSearchErrors++;
      
      logger.warn('ProductSearchService: Failed to enrich product', {
        productName: product.name,
        error: error.message
      });
      
      // Return product with fallback URL
      return {
        product: {
          ...product,
          purchaseUrl: this.generateFallbackUrl(product.name),
          imageUrl: null
        },
        metrics
      };
    }
  }

  /**
   * Build location-aware product search query
   * @param {string} productName - Name of the product
   * @param {Object} location - User location
   * @returns {string} Search query
   */
  buildProductSearchQuery(productName, location) {
    // Build query: "buy [product] online [city] [country]"
    const parts = ['buy', productName, 'online'];
    
    if (location.city) {
      parts.push(location.city);
    }
    
    if (location.country || location.countryName) {
      parts.push(location.country || location.countryName);
    }
    
    return parts.join(' ');
  }

  /**
   * Extract purchase URL from search results
   * @param {Array} results - Search results
   * @returns {string|null} Purchase URL
   */
  extractPurchaseUrl(results) {
    if (!results || results.length === 0) {
      return null;
    }

    // Prioritize known e-commerce domains
    const ecommerceDomains = [
      'amazon.com', 'amazon.co.uk', 'amazon.in', 'amazon.com.au',
      'dawaai.pk', '1mg.com', 'netmeds.com', 'pharmeasy.com',
      'cvs.com', 'walgreens.com', 'boots.com',
      'chemistwarehouse.com.au', 'priceline.com.au',
      'shoppers.pk', 'sehat.com.pk'
    ];

    // First, try to find a result from a known e-commerce domain
    for (const result of results) {
      const url = result.url.toLowerCase();
      if (ecommerceDomains.some(domain => url.includes(domain))) {
        return result.url;
      }
    }

    // If no known e-commerce domain found, return the first result
    return results[0].url;
  }

  /**
   * Generate fallback search URL for product
   * @param {string} productName - Name of the product
   * @returns {string} Generic search URL
   */
  generateFallbackUrl(productName) {
    // Generate generic Google search URL as fallback
    const encodedName = encodeURIComponent(`buy ${productName} online`);
    return `https://www.google.com/search?q=${encodedName}`;
  }
}

// Create singleton instance
const productSearchService = new ProductSearchService();

module.exports = productSearchService;
