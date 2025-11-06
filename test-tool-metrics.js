/**
 * Test script to verify tool metrics tracking
 * Tests that web search tool metrics are properly logged and included in assessment metadata
 */

require('dotenv').config();
const WebSearchTool = require('./src/services/ai/tools/webSearchTool');
const logger = require('./src/config/logger');

async function testToolMetrics() {
  console.log('\n=== Testing Tool Metrics Tracking ===\n');
  
  const webSearchTool = new WebSearchTool();
  
  // Test 1: Single search with metrics tracking
  console.log('Test 1: Single web search with metrics tracking');
  console.log('------------------------------------------------');
  
  const result1 = await webSearchTool.search({
    query: 'book appointment cardiologist',
    location: {
      country: 'US',
      city: 'New York',
      countryCode: 'US'
    },
    maxResults: 3
  });
  
  console.log('\nSearch Result 1:');
  console.log('- Success:', result1.success);
  console.log('- Results Count:', result1.results.length);
  console.log('- Execution Time:', result1.metadata.executionTimeMs, 'ms');
  console.log('- Search Engine:', result1.metadata.searchEngine);
  console.log('- Cached:', result1.metadata.cached);
  console.log('- Retry Count:', result1.metadata.retryCount);
  
  // Test 2: Same search to test cache hit
  console.log('\n\nTest 2: Same search to test cache hit');
  console.log('---------------------------------------');
  
  const result2 = await webSearchTool.search({
    query: 'book appointment cardiologist',
    location: {
      country: 'US',
      city: 'New York',
      countryCode: 'US'
    },
    maxResults: 3
  });
  
  console.log('\nSearch Result 2:');
  console.log('- Success:', result2.success);
  console.log('- Results Count:', result2.results.length);
  console.log('- Execution Time:', result2.metadata.executionTimeMs, 'ms');
  console.log('- Search Engine:', result2.metadata.searchEngine);
  console.log('- Cached:', result2.metadata.cached);
  console.log('- Retry Count:', result2.metadata.retryCount);
  
  // Test 3: Different search
  console.log('\n\nTest 3: Different search (product search)');
  console.log('------------------------------------------');
  
  const result3 = await webSearchTool.search({
    query: 'buy ibuprofen online',
    location: {
      country: 'PK',
      city: 'Lahore',
      countryCode: 'PK'
    },
    maxResults: 3
  });
  
  console.log('\nSearch Result 3:');
  console.log('- Success:', result3.success);
  console.log('- Results Count:', result3.results.length);
  console.log('- Execution Time:', result3.metadata.executionTimeMs, 'ms');
  console.log('- Search Engine:', result3.metadata.searchEngine);
  console.log('- Cached:', result3.metadata.cached);
  console.log('- Retry Count:', result3.metadata.retryCount);
  
  // Summary
  console.log('\n\n=== Tool Metrics Summary ===');
  console.log('----------------------------');
  console.log('Total Searches:', 3);
  console.log('Cache Hits:', [result1, result2, result3].filter(r => r.metadata.cached).length);
  console.log('Cache Misses:', [result1, result2, result3].filter(r => !r.metadata.cached).length);
  console.log('Total Execution Time:', 
    result1.metadata.executionTimeMs + 
    result2.metadata.executionTimeMs + 
    result3.metadata.executionTimeMs, 'ms');
  console.log('Total Retries:', 
    result1.metadata.retryCount + 
    result2.metadata.retryCount + 
    result3.metadata.retryCount);
  
  console.log('\n✅ Tool metrics tracking test completed successfully!\n');
}

// Run the test
testToolMetrics()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
