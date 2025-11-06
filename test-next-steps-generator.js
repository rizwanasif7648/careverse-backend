/**
 * Test script for Next Steps Generator with Web Search Tool
 */

const NextStepsGeneratorAgent = require('./src/services/ai/agents/nextStepsGenerator.js');

async function testNextStepsGenerator() {
  console.log('Testing Next Steps Generator Agent...\n');

  try {
    // Test 1: Instantiate agent
    const agent = new NextStepsGeneratorAgent();
    console.log('✓ NextStepsGeneratorAgent instantiated successfully');
    console.log('✓ Web search tool available:', !!agent.webSearchTool);
    console.log('✓ Enrich method available:', typeof agent.enrichStepsWithLocationAwareUrls === 'function');
    
    // Test 2: Test enrichment with mock data
    const mockSteps = [
      {
        title: 'Find a Cardiologist',
        description: 'Schedule an appointment with a heart specialist',
        icon: 'doctor',
        actionType: 'view_providers',
        url: 'https://example.com/providers'
      },
      {
        title: 'Buy Heart Health Supplements',
        description: 'Purchase recommended supplements',
        icon: 'medication',
        actionType: 'view_products',
        url: 'https://example.com/products'
      },
      {
        title: 'Find Nearest Emergency Room',
        description: 'Locate emergency care facility',
        icon: 'emergency',
        actionType: 'emergency',
        url: null
      }
    ];

    const mockState = {
      userLocation: {
        city: 'Lahore',
        state: 'Punjab',
        country: 'Pakistan',
        countryCode: 'PK',
        latitude: 31.5204,
        longitude: 74.3587
      },
      condition: {
        name: 'Hypertension',
        requiredSpecialty: 'Cardiologist'
      }
    };

    console.log('\nTesting URL enrichment with location:', mockState.userLocation.city, mockState.userLocation.country);
    
    const enrichedSteps = await agent.enrichStepsWithLocationAwareUrls(mockSteps, mockState);
    
    console.log('\n✓ Enrichment completed successfully');
    console.log('\nEnriched Steps:');
    enrichedSteps.forEach((step, index) => {
      console.log(`\n${index + 1}. ${step.title}`);
      console.log(`   Action Type: ${step.actionType}`);
      console.log(`   URL: ${step.url}`);
    });

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testNextStepsGenerator();
