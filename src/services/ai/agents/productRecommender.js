/**
 * Product Recommender Agent
 * Recommends medications and healthcare products using OpenAI function calling
 */

const OpenAI = require('openai');
const config = require('../../../config/config');
const logger = require('../../../config/logger');
const redisService = require('../../cache/redis.service');
const productSearchService = require('../tools/productSearch');
const {
  recommendProductsFunction,
  createProductRecommendationMessages,
  validateProducts
} = require('../prompts/productRecommendation');

class ProductRecommenderAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
    this.model = config.openai.model || 'gpt-3.5-turbo';
    this.maxRetries = 2;
    this.redis = redisService;
    this.cacheTTL = 86400; // 24 hours in seconds
  }

  /**
   * Recommend products for a condition
   * @param {Object} condition - Diagnosed condition from MedicalAnalyzerAgent
   * @param {Array} symptoms - Patient symptoms
   * @returns {Promise<Object>} Product recommendations with token usage
   */
  async recommend(condition, symptoms) {
    const startTime = Date.now();
    
    logger.info('ProductRecommenderAgent: Starting product recommendation', {
      condition: condition.name,
      symptomCount: symptoms.length,
      startTime: new Date(startTime).toISOString()
    });

    try {
      // Step 1: Check Redis cache
      const cacheStartTime = Date.now();
      const cachedProducts = await this.getCachedProducts(condition.name);
      const cacheTime = Date.now() - cacheStartTime;
      
      if (cachedProducts) {
        const executionTime = Date.now() - startTime;
        
        logger.info('ProductRecommenderAgent: Returning cached products', {
          productCount: cachedProducts.length,
          executionTimeMs: executionTime,
          cacheTimeMs: cacheTime,
          cacheHit: true,
          tokensUsed: 0
        });
        
        return {
          products: cachedProducts,
          tokensUsed: 0 // No tokens used for cached results
        };
      }

      // Step 2: Generate recommendations using OpenAI
      const generationStartTime = Date.now();
      const result = await this.generateRecommendationsWithRetry(condition, symptoms);
      const generationTime = Date.now() - generationStartTime;

      // Step 3: Enrich products with purchase links and images
      const enrichStartTime = Date.now();
      const enrichedProducts = await this.enrichProductLinks(result.products);
      const enrichTime = Date.now() - enrichStartTime;
      result.products = enrichedProducts;

      // Step 4: Cache the results
      await this.cacheProducts(condition.name, result.products);

      const executionTime = Date.now() - startTime;

      logger.info('ProductRecommenderAgent: Product recommendation completed', {
        productCount: result.products.length,
        tokensUsed: result.tokensUsed,
        executionTimeMs: executionTime,
        cacheHit: false,
        performance: {
          cacheCheckMs: cacheTime,
          generationMs: generationTime,
          enrichmentMs: enrichTime
        }
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('ProductRecommenderAgent: Failed to recommend products', {
        error: error.message,
        stack: error.stack,
        executionTimeMs: executionTime
      });
      throw error;
    }
  }

  /**
   * Get cached products from Redis
   * @param {string} conditionName - Name of the condition
   * @returns {Promise<Array|null>} Cached products or null
   */
  async getCachedProducts(conditionName) {
    try {
      const cacheKey = this.getCacheKey(conditionName);
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        logger.info('ProductRecommenderAgent: Cache hit', {
          cacheKey,
          condition: conditionName
        });
        return JSON.parse(cached);
      }

      logger.info('ProductRecommenderAgent: Cache miss', {
        cacheKey,
        condition: conditionName
      });

      return null;
    } catch (error) {
      logger.warn('ProductRecommenderAgent: Failed to get cached products', {
        error: error.message,
        condition: conditionName,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * Cache products in Redis
   * @param {string} conditionName - Name of the condition
   * @param {Array} products - Products to cache
   * @returns {Promise<void>}
   */
  async cacheProducts(conditionName, products) {
    try {
      const cacheKey = this.getCacheKey(conditionName);
      await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(products));
      
      logger.debug('ProductRecommenderAgent: Products cached', {
        cacheKey,
        ttl: this.cacheTTL
      });
    } catch (error) {
      logger.warn('ProductRecommenderAgent: Failed to cache products', {
        error: error.message
      });
      // Don't throw - caching failure shouldn't break the flow
    }
  }

  /**
   * Generate cache key for condition
   * @param {string} conditionName - Name of the condition
   * @returns {string} Cache key
   */
  getCacheKey(conditionName) {
    // Normalize condition name for consistent caching
    const normalized = conditionName.toLowerCase().trim().replace(/\s+/g, '_');
    return `products:${normalized}`;
  }

  /**
   * Generate product recommendations with retry logic
   * @param {Object} condition - Diagnosed condition
   * @param {Array} symptoms - Patient symptoms
   * @param {number} attempt - Current attempt number
   * @returns {Promise<Object>} Product recommendations with token usage
   */
  async generateRecommendationsWithRetry(condition, symptoms, attempt = 1) {
    try {
      const messages = createProductRecommendationMessages(condition, symptoms);

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        functions: [recommendProductsFunction],
        function_call: { name: 'recommend_products' },
        temperature: 0.3 // Lower temperature for more consistent recommendations
      });

      // Parse function call response
      const functionCall = response.choices[0].message.function_call;
      
      if (!functionCall || functionCall.name !== 'recommend_products') {
        throw new Error('OpenAI did not return expected function call');
      }

      const recommendationData = JSON.parse(functionCall.arguments);

      // Validate and limit products
      const products = validateProducts(recommendationData.products || []);

      // Track token usage
      const tokensUsed = response.usage?.total_tokens || 0;

      return {
        products,
        tokensUsed
      };
    } catch (error) {
      logger.warn('ProductRecommenderAgent: Recommendation attempt failed', {
        attempt,
        error: error.message
      });

      // Retry logic
      if (attempt < this.maxRetries) {
        logger.info('ProductRecommenderAgent: Retrying recommendation', {
          attempt: attempt + 1
        });
        
        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000);
        
        return this.generateRecommendationsWithRetry(condition, symptoms, attempt + 1);
      }

      // Max retries reached
      throw new Error(`Failed to generate product recommendations after ${this.maxRetries} attempts: ${error.message}`);
    }
  }

  /**
   * Enrich products with purchase links and images
   * @param {Array} products - Products to enrich
   * @returns {Promise<Array>} Enriched products
   */
  async enrichProductLinks(products) {
    try {
      logger.info('ProductRecommenderAgent: Enriching product links', {
        productCount: products.length
      });

      const enrichedProducts = await productSearchService.enrichProducts(products);

      logger.info('ProductRecommenderAgent: Product links enriched', {
        enrichedCount: enrichedProducts.filter(p => p.purchaseUrl).length
      });

      return enrichedProducts;
    } catch (error) {
      logger.warn('ProductRecommenderAgent: Failed to enrich product links', {
        error: error.message
      });
      
      // Return original products if enrichment fails
      return products;
    }
  }

  /**
   * Sleep utility for retry backoff
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ProductRecommenderAgent;
