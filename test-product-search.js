/**
 * Test script for Product Search with Web Search Tool
 * Tests the dynamic product URL discovery based on location
 */

require('dotenv').config();
const ProductRecommenderAgent = require('./src/services/ai/agents/productRecommender');

async function testProductSearch() {
  console.log('=== Testing Product Search with Web Search Tool ===\n');

  const agent = new ProductRecommenderAgent();

  // Test condition
  const testCondition = {
    name: 'Common Cold',
    description: 'Viral infection of the upper respiratory tract',
    commonTriggers: ['Viral exposure', 'Weakened immune system'],
    initialSelfCare: ['Rest', 'Hydration', 'Over-the-counter medications'],
    requiredSpecialty: 'General Practice',
    confidence: 0.85
  };

  // Test symptoms
  const testSymptoms = [
    { name: 'Runny nose', severity: 'mild' },
    { name: 'Sore throat', severity: 'moderate' },
    { name: 'Cough', severity: 'mild' }
  ];

  // Test locations
  const testLocations = [
    {
      name: 'United States',
      country: 'US',
      countryName: 'United States',
      city: 'New York',
      state: 'NY'
    },
    {
      name: 'Pakistan',
      country: 'PK',
      countryName: 'Pakistan',
      city: 'Lahore',
      state: 'Punjab'
    },
    {
      name: 'India',
      country: 'IN',
      countryName: 'India',
      city: 'Mumbai',
      state: 'Maharashtra'
    }
  ];

  for (const location of testLocations) {
    console.log(`\n--- Testing with ${location.name} location ---`);
    console.log(`Location: ${location.city}, ${location.countryName}`);

    try {
      const startTime = Date.now();
      const result = await agent.recommend(testCondition, testSymptoms, location);
      const executionTime = Date.now() - startTime;

      console.log(`\n✓ Product recommendation completed in ${executionTime}ms`);
      console.log(`  Products found: ${result.products.length}`);
      console.log(`  Tokens used: ${result.tokensUsed}`);

      // Display first 2 products
      if (result.products.length > 0) {
        console.log('\n  Sample products:');
        result.products.slice(0, 2).forEach((product, index) => {
          console.log(`\n  ${index + 1}. ${product.name}`);
          console.log(`     Type: ${product.type}`);
          console.log(`     Purpose: ${product.purpose}`);
          console.log(`     Purchase URL: ${product.purchaseUrl || 'Not available'}`);
          
          // Check if URL is location-specific
          const url = product.purchaseUrl || '';
          const isLocationSpecific = 
            (location.country === 'PK' && (url.includes('.pk') || url.includes('pakistan'))) ||
            (location.country === 'IN' && (url.includes('.in') || url.includes('india'))) ||
            (location.country === 'US' && (url.includes('.com') && !url.includes('.pk') && !url.includes('.in')));
          
          if (isLocationSpecific) {
            console.log(`     ✓ URL appears location-specific for ${location.country}`);
          }
        });
      }

    } catch (error) {
      console.error(`\n✗ Error testing ${location.name}:`, error.message);
      console.error('  Stack:', error.stack);
    }
  }

  console.log('\n=== Test Complete ===\n');
  process.exit(0);
}

// Run test
testProductSearch().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
