/**
 * Test Product Recommender with Multiple Locations
 * Tests Product Recommender agent with US, Pakistan, and India locations
 * Verifies purchase URLs are valid and location-appropriate
 */

require('dotenv').config();
const ProductRecommenderAgent = require('./src/services/ai/agents/productRecommender');
const redisService = require('./src/services/cache/redis.service');
const logger = require('./src/config/logger');

// Test locations
const testLocations = {
  us: {
    country: 'US',
    countryName: 'United States',
    city: 'New York',
    latitude: 40.7128,
    longitude: -74.0060
  },
  pakistan: {
    country: 'PK',
    countryName: 'Pakistan',
    city: 'Lahore',
    latitude: 31.5204,
    longitude: 74.3587
  },
  india: {
    country: 'IN',
    countryName: 'India',
    city: 'Mumbai',
    latitude: 19.0760,
    longitude: 72.8777
  }
};

// Test condition
const testCondition = {
  name: 'Common Cold',
  severity: 'mild',
  description: 'Viral infection of the upper respiratory tract'
};

const testSymptoms = [
  { name: 'runny nose', severity: 'moderate' },
  { name: 'sore throat', severity: 'mild' },
  { name: 'cough', severity: 'mild' }
];

// Expected platform patterns for each location
const expectedPlatforms = {
  us: ['amazon', 'cvs', 'walgreens', 'walmart'],
  pakistan: ['daraz', 'dawaai', 'sehat', 'marham'],
  india: ['amazon.in', '1mg', 'pharmeasy', 'netmeds']
};

async function testProductRecommenderWithLocation(locationName, location) {
  console.log(`\n=== Testing Product Recommender: ${locationName} ===\n`);
  console.log(`Location: ${location.city}, ${location.countryName}`);
  console.log(`Condition: ${testCondition.name}\n`);

  const productRecommender = new ProductRecommenderAgent();

  try {
    const startTime = Date.now();
    
    const result = await productRecommender.recommend(testCondition, testSymptoms, location);

    const executionTime = Date.now() - startTime;

    console.log('✓ Product recommendation completed');
    console.log(`  Execution time: ${executionTime}ms`);
    console.log(`  Products recommended: ${result.products.length}`);
    console.log(`  Tokens used: ${result.tokensUsed}`);
    
    if (result.toolMetrics) {
      console.log(`\n  Tool Metrics:`);
      console.log(`    Web search invocations: ${result.toolMetrics.webSearchInvocations}`);
      console.log(`    Web search execution time: ${result.toolMetrics.webSearchExecutionTimeMs}ms`);
      console.log(`    Cache hits: ${result.toolMetrics.webSearchCacheHits}`);
      console.log(`    Cache misses: ${result.toolMetrics.webSearchCacheMisses}`);
      console.log(`    Errors: ${result.toolMetrics.webSearchErrors}`);
      console.log(`    Retries: ${result.toolMetrics.webSearchRetries}`);
    }

    if (result.products.length > 0) {
      console.log(`\n  Recommended Products:`);
      
      // Show all products
      result.products.forEach((product, index) => {
        console.log(`\n  ${index + 1}. ${product.name}`);
        console.log(`     Type: ${product.type}`);
        console.log(`     Description: ${product.description.substring(0, 100)}...`);
        console.log(`     Dosage: ${product.dosage || 'N/A'}`);
        console.log(`     Purchase URL: ${product.purchaseUrl || 'Not available'}`);
      });

      // Analyze purchase URLs
      console.log(`\n  Purchase URL Analysis:`);
      const productsWithUrls = result.products.filter(p => p.purchaseUrl);
      console.log(`    Products with purchase URLs: ${productsWithUrls.length}/${result.products.length}`);
      
      if (productsWithUrls.length > 0) {
        // Check if URLs contain expected platform keywords
        const platformMatches = {};
        const expectedPlatformList = expectedPlatforms[locationName.toLowerCase()] || [];
        
        expectedPlatformList.forEach(platform => {
          const count = productsWithUrls.filter(p => 
            p.purchaseUrl.toLowerCase().includes(platform)
          ).length;
          if (count > 0) {
            platformMatches[platform] = count;
          }
        });

        if (Object.keys(platformMatches).length > 0) {
          console.log(`    ✓ Location-appropriate platforms found:`);
          Object.entries(platformMatches).forEach(([platform, count]) => {
            console.log(`      - ${platform}: ${count} product(s)`);
          });
        } else {
          console.log(`    ⚠ No expected platforms found in URLs`);
          console.log(`    Expected platforms: ${expectedPlatformList.join(', ')}`);
          console.log(`    Sample URLs:`);
          productsWithUrls.slice(0, 3).forEach(p => {
            console.log(`      - ${p.purchaseUrl}`);
          });
        }

        // Validate URLs
        let validUrls = 0;
        let httpsUrls = 0;
        productsWithUrls.forEach(product => {
          try {
            const url = new URL(product.purchaseUrl);
            validUrls++;
            if (url.protocol === 'https:') {
              httpsUrls++;
            }
          } catch (error) {
            console.log(`    ✗ Invalid URL for ${product.name}: ${product.purchaseUrl}`);
          }
        });

        console.log(`    Valid URLs: ${validUrls}/${productsWithUrls.length}`);
        console.log(`    HTTPS URLs: ${httpsUrls}/${productsWithUrls.length}`);
      }
    } else {
      console.log(`\n  ⚠ No products recommended`);
    }

    return {
      success: true,
      productCount: result.products.length,
      productsWithUrls: result.products.filter(p => p.purchaseUrl).length,
      tokensUsed: result.tokensUsed,
      executionTime,
      toolMetrics: result.toolMetrics
    };

  } catch (error) {
    console.error(`\n✗ Product recommendation failed:`);
    console.error(`  Error: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
    
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('\n=== Product Recommender Multi-Location Testing ===\n');

  try {
    // Connect to Redis
    await redisService.connect();
    console.log('✓ Connected to Redis');

    // Test results
    const results = {};

    // Test 1: US Location
    results.us = await testProductRecommenderWithLocation('US', testLocations.us);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Pakistan Location
    results.pakistan = await testProductRecommenderWithLocation('Pakistan', testLocations.pakistan);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: India Location
    results.india = await testProductRecommenderWithLocation('India', testLocations.india);

    // Summary
    console.log('\n\n=== Test Summary ===\n');
    
    Object.entries(results).forEach(([location, result]) => {
      if (result.success) {
        console.log(`✓ ${location.toUpperCase()}:`);
        console.log(`  Products recommended: ${result.productCount}`);
        console.log(`  With purchase URLs: ${result.productsWithUrls}`);
        console.log(`  Tokens used: ${result.tokensUsed}`);
        console.log(`  Execution time: ${result.executionTime}ms`);
        if (result.toolMetrics) {
          console.log(`  Web searches: ${result.toolMetrics.webSearchInvocations}`);
        }
      } else {
        console.log(`✗ ${location.toUpperCase()}: ${result.error}`);
      }
    });

    // Overall statistics
    const successfulTests = Object.values(results).filter(r => r.success).length;
    const totalProducts = Object.values(results).reduce((sum, r) => sum + (r.productCount || 0), 0);
    const totalWithUrls = Object.values(results).reduce((sum, r) => sum + (r.productsWithUrls || 0), 0);
    const totalTokens = Object.values(results).reduce((sum, r) => sum + (r.tokensUsed || 0), 0);
    const totalWebSearches = Object.values(results).reduce((sum, r) => 
      sum + (r.toolMetrics?.webSearchInvocations || 0), 0
    );

    console.log(`\nOverall Statistics:`);
    console.log(`  Successful tests: ${successfulTests}/3`);
    console.log(`  Total products recommended: ${totalProducts}`);
    console.log(`  Total with purchase URLs: ${totalWithUrls}`);
    console.log(`  Total tokens used: ${totalTokens}`);
    console.log(`  Total web searches performed: ${totalWebSearches}`);

    if (successfulTests === 3) {
      console.log(`\n✓ All location tests passed successfully!`);
    } else {
      console.log(`\n⚠ Some tests failed - see details above`);
    }

    process.exit(0);

  } catch (error) {
    console.error('\n\n=== Tests Failed ===\n');
    console.error(error);
    process.exit(1);
  } finally {
    // Close connections
    await redisService.disconnect();
  }
}

// Run tests
main();
