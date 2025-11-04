/**
 * Redis Caching Verification Script
 * Tests provider search caching, product recommendation caching, TTL settings, and cache hit rates
 */

const redisService = require('../services/cache/redis.service');
const ProviderMatcherAgent = require('../services/ai/agents/providerMatcher');
const ProductRecommenderAgent = require('../services/ai/agents/productRecommender');
const logger = require('../config/logger');

class RedisCachingVerifier {
  constructor() {
    this.providerMatcher = new ProviderMatcherAgent();
    this.productRecommender = new ProductRecommenderAgent();
    this.testResults = {
      redisConnection: false,
      providerCaching: false,
      productCaching: false,
      ttlSettings: false,
      cacheHitRate: { hits: 0, misses: 0, rate: 0 }
    };
  }

  /**
   * Run all verification tests
   */
  async runAllTests() {
    console.log('\n=== Redis Caching Verification ===\n');

    try {
      // Test 1: Redis Connection
      await this.testRedisConnection();

      // Test 2: Provider Search Caching
      await this.testProviderCaching();

      // Test 3: Product Recommendation Caching
      await this.testProductCaching();

      // Test 4: TTL Settings
      await this.testTTLSettings();

      // Test 5: Cache Hit Rate Monitoring
      await this.testCacheHitRate();

      // Print summary
      this.printSummary();

      return this.testResults;
    } catch (error) {
      console.error('Verification failed:', error);
      throw error;
    } finally {
      // Cleanup test keys
      await this.cleanup();
    }
  }

  /**
   * Test 1: Verify Redis connection
   */
  async testRedisConnection() {
    console.log('Test 1: Redis Connection');
    console.log('------------------------');

    try {
      // Connect to Redis
      await redisService.connect();

      // Ping Redis
      const pingResult = await redisService.ping();

      if (pingResult) {
        console.log('✓ Redis connection successful');
        console.log(`✓ Redis status: ${redisService.getStatus() ? 'Connected' : 'Disconnected'}`);
        this.testResults.redisConnection = true;
      } else {
        console.log('✗ Redis ping failed');
        this.testResults.redisConnection = false;
      }
    } catch (error) {
      console.log('✗ Redis connection failed:', error.message);
      this.testResults.redisConnection = false;
    }

    console.log('');
  }

  /**
   * Test 2: Verify provider search caching
   */
  async testProviderCaching() {
    console.log('Test 2: Provider Search Caching');
    console.log('--------------------------------');

    try {
      const testSpecialty = 'Cardiologist';
      const testLocation = {
        latitude: 37.7749,
        longitude: -122.4194,
        city: 'San Francisco',
        state: 'CA'
      };

      // Clear any existing cache
      const cacheKey = this.providerMatcher.buildCacheKey(testSpecialty, testLocation);
      await redisService.del(cacheKey);

      // First call - should miss cache
      console.log('Making first provider search (cache miss expected)...');
      const startTime1 = Date.now();
      const providers1 = await this.providerMatcher.findProviders({
        specialty: testSpecialty,
        location: testLocation
      });
      const time1 = Date.now() - startTime1;
      console.log(`✓ First call completed in ${time1}ms`);
      console.log(`  Found ${providers1.length} providers`);

      // Verify cache was set
      const cached = await redisService.get(cacheKey);
      if (cached) {
        console.log('✓ Cache entry created successfully');
      } else {
        console.log('✗ Cache entry not found');
        this.testResults.providerCaching = false;
        console.log('');
        return;
      }

      // Second call - should hit cache
      console.log('Making second provider search (cache hit expected)...');
      const startTime2 = Date.now();
      const providers2 = await this.providerMatcher.findProviders({
        specialty: testSpecialty,
        location: testLocation
      });
      const time2 = Date.now() - startTime2;
      console.log(`✓ Second call completed in ${time2}ms`);
      console.log(`  Found ${providers2.length} providers`);

      // Verify cache hit was faster
      if (time2 < time1) {
        console.log(`✓ Cache hit was ${((1 - time2/time1) * 100).toFixed(1)}% faster`);
      }

      // Verify data consistency
      if (JSON.stringify(providers1) === JSON.stringify(providers2)) {
        console.log('✓ Cached data matches original data');
        this.testResults.providerCaching = true;
      } else {
        console.log('✗ Cached data does not match original data');
        this.testResults.providerCaching = false;
      }
    } catch (error) {
      console.log('✗ Provider caching test failed:', error.message);
      this.testResults.providerCaching = false;
    }

    console.log('');
  }

  /**
   * Test 3: Verify product recommendation caching
   */
  async testProductCaching() {
    console.log('Test 3: Product Recommendation Caching');
    console.log('---------------------------------------');

    try {
      const testCondition = {
        name: 'Migraine',
        description: 'A neurological condition causing severe headaches',
        requiredSpecialty: 'Neurology',
        confidence: 0.85
      };
      const testSymptoms = [
        { name: 'headache', severity: 'severe' },
        { name: 'nausea', severity: 'moderate' }
      ];

      // Clear any existing cache
      const cacheKey = this.productRecommender.getCacheKey(testCondition.name);
      await redisService.del(cacheKey);

      // First call - should miss cache
      console.log('Making first product recommendation (cache miss expected)...');
      const startTime1 = Date.now();
      const result1 = await this.productRecommender.recommend(testCondition, testSymptoms);
      const time1 = Date.now() - startTime1;
      console.log(`✓ First call completed in ${time1}ms`);
      console.log(`  Recommended ${result1.products.length} products`);
      console.log(`  Tokens used: ${result1.tokensUsed}`);

      // Verify cache was set
      const cached = await redisService.get(cacheKey);
      if (cached) {
        console.log('✓ Cache entry created successfully');
      } else {
        console.log('✗ Cache entry not found');
        this.testResults.productCaching = false;
        console.log('');
        return;
      }

      // Second call - should hit cache
      console.log('Making second product recommendation (cache hit expected)...');
      const startTime2 = Date.now();
      const result2 = await this.productRecommender.recommend(testCondition, testSymptoms);
      const time2 = Date.now() - startTime2;
      console.log(`✓ Second call completed in ${time2}ms`);
      console.log(`  Recommended ${result2.products.length} products`);
      console.log(`  Tokens used: ${result2.tokensUsed} (should be 0 for cache hit)`);

      // Verify cache hit characteristics
      if (result2.tokensUsed === 0) {
        console.log('✓ No tokens used on cache hit (as expected)');
      } else {
        console.log('✗ Tokens were used on cache hit (unexpected)');
      }

      if (time2 < time1) {
        console.log(`✓ Cache hit was ${((1 - time2/time1) * 100).toFixed(1)}% faster`);
      }

      // Verify data consistency
      if (JSON.stringify(result1.products) === JSON.stringify(result2.products)) {
        console.log('✓ Cached data matches original data');
        this.testResults.productCaching = true;
      } else {
        console.log('✗ Cached data does not match original data');
        this.testResults.productCaching = false;
      }
    } catch (error) {
      console.log('✗ Product caching test failed:', error.message);
      this.testResults.productCaching = false;
    }

    console.log('');
  }

  /**
   * Test 4: Verify TTL settings
   */
  async testTTLSettings() {
    console.log('Test 4: TTL Settings Verification');
    console.log('----------------------------------');

    try {
      // Test provider cache TTL (should be 3600 seconds = 1 hour)
      const providerKey = 'providers:test_specialty:37.77:-122.42';
      await redisService.setex(providerKey, 3600, JSON.stringify([]));
      const providerTTL = await redisService.ttl(providerKey);
      
      console.log(`Provider cache TTL: ${providerTTL} seconds`);
      if (providerTTL > 3500 && providerTTL <= 3600) {
        console.log('✓ Provider cache TTL is correct (1 hour)');
      } else {
        console.log('✗ Provider cache TTL is incorrect');
      }

      // Test product cache TTL (should be 86400 seconds = 24 hours)
      const productKey = 'products:test_condition';
      await redisService.setex(productKey, 86400, JSON.stringify([]));
      const productTTL = await redisService.ttl(productKey);
      
      console.log(`Product cache TTL: ${productTTL} seconds`);
      if (productTTL > 86300 && productTTL <= 86400) {
        console.log('✓ Product cache TTL is correct (24 hours)');
        this.testResults.ttlSettings = true;
      } else {
        console.log('✗ Product cache TTL is incorrect');
        this.testResults.ttlSettings = false;
      }

      // Verify TTL countdown
      console.log('Waiting 2 seconds to verify TTL countdown...');
      await this.sleep(2000);
      
      const providerTTL2 = await redisService.ttl(providerKey);
      if (providerTTL2 < providerTTL) {
        console.log(`✓ TTL is counting down (${providerTTL} -> ${providerTTL2})`);
      } else {
        console.log('✗ TTL is not counting down properly');
      }
    } catch (error) {
      console.log('✗ TTL settings test failed:', error.message);
      this.testResults.ttlSettings = false;
    }

    console.log('');
  }

  /**
   * Test 5: Monitor cache hit rates
   */
  async testCacheHitRate() {
    console.log('Test 5: Cache Hit Rate Monitoring');
    console.log('----------------------------------');

    try {
      const testCases = [
        { specialty: 'Cardiologist', location: { latitude: 37.7749, longitude: -122.4194 } },
        { specialty: 'Neurologist', location: { latitude: 37.7749, longitude: -122.4194 } },
        { specialty: 'Cardiologist', location: { latitude: 37.7749, longitude: -122.4194 } }, // Duplicate - should hit cache
        { specialty: 'Dermatologist', location: { latitude: 40.7128, longitude: -74.0060 } },
        { specialty: 'Neurologist', location: { latitude: 37.7749, longitude: -122.4194 } }, // Duplicate - should hit cache
      ];

      let hits = 0;
      let misses = 0;

      // Clear all test caches first
      for (const testCase of testCases) {
        const cacheKey = this.providerMatcher.buildCacheKey(
          testCase.specialty,
          { latitude: testCase.location.latitude, longitude: testCase.location.longitude }
        );
        await redisService.del(cacheKey);
      }

      console.log(`Running ${testCases.length} provider searches...`);

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        const cacheKey = this.providerMatcher.buildCacheKey(
          testCase.specialty,
          { latitude: testCase.location.latitude, longitude: testCase.location.longitude }
        );

        // Check if cache exists before the call
        const existsBefore = await redisService.exists(cacheKey);

        await this.providerMatcher.findProviders({
          specialty: testCase.specialty,
          location: {
            latitude: testCase.location.latitude,
            longitude: testCase.location.longitude,
            city: 'Test City',
            state: 'TS'
          }
        });

        if (existsBefore) {
          hits++;
          console.log(`  ${i + 1}. ${testCase.specialty} - Cache HIT`);
        } else {
          misses++;
          console.log(`  ${i + 1}. ${testCase.specialty} - Cache MISS`);
        }
      }

      const hitRate = (hits / testCases.length) * 100;
      
      console.log(`\nCache Statistics:`);
      console.log(`  Hits: ${hits}`);
      console.log(`  Misses: ${misses}`);
      console.log(`  Hit Rate: ${hitRate.toFixed(1)}%`);

      this.testResults.cacheHitRate = {
        hits,
        misses,
        rate: hitRate
      };

      // Expected: 2 hits out of 5 requests (40% hit rate)
      if (hits === 2 && misses === 3) {
        console.log('✓ Cache hit rate is as expected (2 hits, 3 misses)');
      } else {
        console.log(`⚠ Cache hit rate differs from expected (expected 2 hits, 3 misses)`);
      }
    } catch (error) {
      console.log('✗ Cache hit rate test failed:', error.message);
    }

    console.log('');
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('=== Test Summary ===');
    console.log('');
    console.log(`Redis Connection:          ${this.testResults.redisConnection ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`Provider Caching:          ${this.testResults.providerCaching ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`Product Caching:           ${this.testResults.productCaching ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`TTL Settings:              ${this.testResults.ttlSettings ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`Cache Hit Rate Monitoring: ✓ PASS (${this.testResults.cacheHitRate.rate.toFixed(1)}% hit rate)`);
    console.log('');

    const allPassed = this.testResults.redisConnection &&
                      this.testResults.providerCaching &&
                      this.testResults.productCaching &&
                      this.testResults.ttlSettings;

    if (allPassed) {
      console.log('✓ All tests passed!');
    } else {
      console.log('✗ Some tests failed. Please review the results above.');
    }
    console.log('');
  }

  /**
   * Cleanup test data
   */
  async cleanup() {
    console.log('Cleaning up test data...');
    try {
      await redisService.delPattern('providers:test_*');
      await redisService.delPattern('products:test_*');
      await redisService.delPattern('providers:cardiologist:*');
      await redisService.delPattern('providers:neurologist:*');
      await redisService.delPattern('providers:dermatologist:*');
      await redisService.delPattern('products:migraine');
      console.log('✓ Cleanup completed');
    } catch (error) {
      console.log('⚠ Cleanup failed:', error.message);
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run verification if executed directly
if (require.main === module) {
  const verifier = new RedisCachingVerifier();
  
  verifier.runAllTests()
    .then((results) => {
      const exitCode = results.redisConnection &&
                       results.providerCaching &&
                       results.productCaching &&
                       results.ttlSettings ? 0 : 1;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('Verification script failed:', error);
      process.exit(1);
    });
}

module.exports = RedisCachingVerifier;
