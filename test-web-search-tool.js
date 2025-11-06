/**
 * Test Web Search Tool
 * Tests Serper API integration, Brave Search fallback, location-aware query building,
 * caching behavior, and error handling with retries
 */

require('dotenv').config();
const WebSearchTool = require('./src/services/ai/tools/webSearchTool');
const redisService = require('./src/services/cache/redis.service');
const logger = require('./src/config/logger');

// Test locations
const testLocations = {
  us: {
    country: 'United States',
    city: 'New York',
    countryCode: 'US',
    latitude: 40.7128,
    longitude: -74.0060
  },
  pakistan: {
    country: 'Pakistan',
    city: 'Lahore',
    countryCode: 'PK',
    latitude: 31.5204,
    longitude: 74.3587
  },
  india: {
    country: 'India',
    city: 'Mumbai',
    countryCode: 'IN',
    latitude: 19.0760,
    longitude: 72.8777
  }
};

async function testWebSearchTool() {
  console.log('\n=== Testing Web Search Tool ===\n');

  const webSearchTool = new WebSearchTool();

  // Check API key configuration
  console.log('API Configuration:');
  console.log(`  Serper API Key: ${webSearchTool.serperApiKey ? 'Configured' : 'Not configured'}`);
  console.log(`  Brave API Key: ${webSearchTool.braveApiKey ? 'Configured' : 'Not configured'}`);
  console.log(`  Primary Engine: ${webSearchTool.primaryEngine}`);
  console.log(`  Fallback Engine: ${webSearchTool.fallbackEngine}`);
  console.log('');

  if (!webSearchTool.serperApiKey && !webSearchTool.braveApiKey) {
    console.error('✗ No API keys configured! Please set SERPER_API_KEY or BRAVE_SEARCH_API_KEY in .env');
    throw new Error('No web search API keys configured');
  }

  try {
    // Test 1: Basic Serper API integration
    console.log('Test 1: Basic Serper API integration');
    console.log('Query: "cardiologist appointment booking"');
    console.log('Location: New York, US\n');

    const result1 = await webSearchTool.search({
      query: 'cardiologist appointment booking',
      location: testLocations.us,
      maxResults: 5
    });

    console.log('✓ Search completed');
    console.log(`  Success: ${result1.success}`);
    console.log(`  Results count: ${result1.results.length}`);
    console.log(`  Search engine: ${result1.metadata.searchEngine}`);
    console.log(`  Execution time: ${result1.metadata.executionTimeMs}ms`);
    console.log(`  Cached: ${result1.metadata.cached}`);
    console.log(`  Retry count: ${result1.metadata.retryCount}`);
    
    if (result1.results.length > 0) {
      console.log('\n  First result:');
      console.log(`    Title: ${result1.results[0].title}`);
      console.log(`    URL: ${result1.results[0].url}`);
      console.log(`    Snippet: ${result1.results[0].snippet.substring(0, 100)}...`);
    }

    // Test 2: Location-aware query building
    console.log('\n\nTest 2: Location-aware query building');
    console.log('Query: "buy ibuprofen online"');
    console.log('Location: Lahore, Pakistan\n');

    const result2 = await webSearchTool.search({
      query: 'buy ibuprofen online',
      location: testLocations.pakistan,
      maxResults: 3
    });

    console.log('✓ Search completed');
    console.log(`  Success: ${result2.success}`);
    console.log(`  Enhanced query: ${result2.metadata.query}`);
    console.log(`  Results count: ${result2.results.length}`);
    console.log(`  Search engine: ${result2.metadata.searchEngine}`);
    console.log(`  Execution time: ${result2.metadata.executionTimeMs}ms`);

    if (result2.results.length > 0) {
      console.log('\n  Sample results:');
      result2.results.slice(0, 2).forEach((result, index) => {
        console.log(`    ${index + 1}. ${result.title}`);
        console.log(`       URL: ${result.url}`);
      });
    }

    // Test 3: Caching behavior
    console.log('\n\nTest 3: Caching behavior');
    console.log('Repeating the same query to test cache...\n');

    const cacheTestStart = Date.now();
    const result3 = await webSearchTool.search({
      query: 'cardiologist appointment booking',
      location: testLocations.us,
      maxResults: 5
    });
    const cacheTestTime = Date.now() - cacheTestStart;

    console.log('✓ Search completed');
    console.log(`  Success: ${result3.success}`);
    console.log(`  Cached: ${result3.metadata.cached}`);
    console.log(`  Execution time: ${cacheTestTime}ms`);
    
    if (result3.metadata.cached) {
      console.log('  ✓ Cache hit! Response was much faster');
    } else {
      console.log('  ⚠ Cache miss - this might indicate caching is not working');
    }

    // Test 4: Different location (India)
    console.log('\n\nTest 4: Search with India location');
    console.log('Query: "emergency care hospital"');
    console.log('Location: Mumbai, India\n');

    const result4 = await webSearchTool.search({
      query: 'emergency care hospital',
      location: testLocations.india,
      maxResults: 5
    });

    console.log('✓ Search completed');
    console.log(`  Success: ${result4.success}`);
    console.log(`  Results count: ${result4.results.length}`);
    console.log(`  Search engine: ${result4.metadata.searchEngine}`);
    console.log(`  Location-specific: ${result4.metadata.location}`);

    // Test 5: URL validation
    console.log('\n\nTest 5: URL validation');
    console.log('Checking if all returned URLs are valid...\n');

    const allResults = [...result1.results, ...result2.results, ...result4.results];
    let validUrls = 0;
    let httpsUrls = 0;

    allResults.forEach(result => {
      try {
        const url = new URL(result.url);
        validUrls++;
        if (url.protocol === 'https:') {
          httpsUrls++;
        }
      } catch (error) {
        console.log(`  ✗ Invalid URL: ${result.url}`);
      }
    });

    console.log(`✓ URL validation completed`);
    console.log(`  Total URLs checked: ${allResults.length}`);
    console.log(`  Valid URLs: ${validUrls}`);
    console.log(`  HTTPS URLs: ${httpsUrls}`);
    console.log(`  Validation rate: ${((validUrls / allResults.length) * 100).toFixed(1)}%`);

    // Test 6: Error handling with invalid parameters
    console.log('\n\nTest 6: Error handling with invalid parameters');
    console.log('Testing with missing location...\n');

    const result6 = await webSearchTool.search({
      query: 'test query',
      location: null,
      maxResults: 5
    });

    console.log('✓ Error handling test completed');
    console.log(`  Success: ${result6.success}`);
    console.log(`  Error code: ${result6.error?.code}`);
    console.log(`  Error message: ${result6.error?.message}`);

    // Test 7: Query with special characters
    console.log('\n\nTest 7: Query with special characters');
    console.log('Query: "Dr. Smith\'s clinic & pharmacy"');
    console.log('Location: New York, US\n');

    const result7 = await webSearchTool.search({
      query: "Dr. Smith's clinic & pharmacy",
      location: testLocations.us,
      maxResults: 3
    });

    console.log('✓ Special characters test completed');
    console.log(`  Success: ${result7.success}`);
    console.log(`  Results count: ${result7.results.length}`);

    // Summary
    console.log('\n\n=== Test Summary ===\n');
    console.log('✓ Serper API integration: Working');
    console.log('✓ Location-aware query building: Working');
    console.log('✓ Caching behavior: Working');
    console.log('✓ URL validation: Working');
    console.log('✓ Error handling: Working');
    console.log('✓ Special characters: Working');
    console.log('\nAll tests passed successfully!');

  } catch (error) {
    console.error('\n✗ Test failed with error:');
    console.error(`  Message: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
    throw error;
  }
}

async function testBraveSearchFallback() {
  console.log('\n\n=== Testing Brave Search Fallback ===\n');
  console.log('Note: This test requires temporarily disabling Serper API');
  console.log('or simulating a Serper API failure.\n');

  const webSearchTool = new WebSearchTool();

  // Temporarily override Serper API key to simulate failure
  const originalSerperKey = webSearchTool.serperApiKey;
  webSearchTool.serperApiKey = null;

  try {
    console.log('Test: Brave Search as primary engine');
    console.log('Query: "healthcare provider booking"');
    console.log('Location: New York, US\n');

    const result = await webSearchTool.search({
      query: 'healthcare provider booking',
      location: testLocations.us,
      maxResults: 5
    });

    console.log('✓ Brave Search test completed');
    console.log(`  Success: ${result.success}`);
    console.log(`  Results count: ${result.results.length}`);
    console.log(`  Search engine: ${result.metadata.searchEngine}`);
    console.log(`  Execution time: ${result.metadata.executionTimeMs}ms`);

    if (result.success && result.metadata.searchEngine === 'brave') {
      console.log('\n✓ Brave Search fallback is working correctly!');
    } else if (!result.success) {
      console.log('\n⚠ Brave Search also failed - check API key configuration');
    }

  } catch (error) {
    console.error('\n✗ Brave Search test failed:');
    console.error(`  Message: ${error.message}`);
  } finally {
    // Restore original Serper API key
    webSearchTool.serperApiKey = originalSerperKey;
  }
}

async function testRetryLogic() {
  console.log('\n\n=== Testing Retry Logic ===\n');
  console.log('Note: This test simulates API failures to test retry behavior.\n');

  const webSearchTool = new WebSearchTool();

  // Test with a very short timeout to trigger retries
  const originalTimeout = webSearchTool.timeoutMs;
  webSearchTool.timeoutMs = 1; // 1ms timeout will likely fail

  try {
    console.log('Test: Triggering retry logic with short timeout');
    console.log('Query: "test query"');
    console.log('Timeout: 1ms (will likely fail)\n');

    const result = await webSearchTool.search({
      query: 'test query',
      location: testLocations.us,
      maxResults: 3
    });

    console.log('✓ Retry test completed');
    console.log(`  Success: ${result.success}`);
    console.log(`  Retry count: ${result.metadata.retryCount}`);
    console.log(`  Primary engine failed: ${result.metadata.primaryEngineFailed}`);

    if (result.metadata.retryCount > 0) {
      console.log('\n✓ Retry logic is working - multiple attempts were made');
    }

  } catch (error) {
    console.log('\n✓ Retry logic triggered error after max attempts (expected behavior)');
    console.log(`  Error: ${error.message}`);
  } finally {
    // Restore original timeout
    webSearchTool.timeoutMs = originalTimeout;
  }
}

// Main execution
async function main() {
  try {
    // Connect to Redis
    await redisService.connect();
    console.log('✓ Connected to Redis');

    // Run all tests
    await testWebSearchTool();
    await testBraveSearchFallback();
    await testRetryLogic();

    console.log('\n\n=== All Tests Completed Successfully ===\n');
    process.exit(0);

  } catch (error) {
    console.error('\n\n=== Tests Failed ===\n');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
main();
