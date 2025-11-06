/**
 * Comprehensive test for Next Steps Generator with location-aware web search
 */

const NextStepsGeneratorAgent = require('./src/services/ai/agents/nextStepsGenerator.js');

async function testLocationAwareNextSteps() {
  console.log('Testing Next Steps Generator with Location-Aware Web Search\n');
  console.log('='.repeat(70));

  try {
    const agent = new NextStepsGeneratorAgent();
    
    // Test Case 1: US Location
    console.log('\n\nTest Case 1: US Location (New York)');
    console.log('-'.repeat(70));
    
    const usSteps = [
      {
        title: 'Find a Cardiologist',
        description: 'Schedule an appointment with a heart specialist',
        icon: 'doctor',
        actionType: 'view_providers'
      },
      {
        title: 'Buy Blood Pressure Monitor',
        description: 'Purchase a home blood pressure monitoring device',
        icon: 'medication',
        actionType: 'view_products'
      }
    ];

    const usState = {
      userLocation: {
        city: 'New York',
        state: 'NY',
        country: 'United States',
        countryCode: 'US',
        latitude: 40.7128,
        longitude: -74.0060
      },
      condition: {
        name: 'Hypertension',
        requiredSpecialty: 'Cardiologist'
      }
    };

    const enrichedUsSteps = await agent.enrichStepsWithLocationAwareUrls(usSteps, usState);
    
    console.log('\nEnriched Steps for US:');
    enrichedUsSteps.forEach((step, index) => {
      console.log(`\n${index + 1}. ${step.title}`);
      console.log(`   Type: ${step.actionType}`);
      console.log(`   URL: ${step.url}`);
    });

    // Test Case 2: Pakistan Location
    console.log('\n\nTest Case 2: Pakistan Location (Lahore)');
    console.log('-'.repeat(70));
    
    const pkSteps = [
      {
        title: 'Find a Cardiologist',
        description: 'Schedule an appointment with a heart specialist',
        icon: 'doctor',
        actionType: 'view_providers'
      },
      {
        title: 'Buy Heart Medications',
        description: 'Purchase prescribed medications',
        icon: 'medication',
        actionType: 'view_products'
      },
      {
        title: 'Seek Emergency Care',
        description: 'Find nearest emergency room',
        icon: 'emergency',
        actionType: 'emergency'
      }
    ];

    const pkState = {
      userLocation: {
        city: 'Lahore',
        state: 'Punjab',
        country: 'Pakistan',
        countryCode: 'PK',
        latitude: 31.5204,
        longitude: 74.3587
      },
      condition: {
        name: 'Chest Pain',
        requiredSpecialty: 'Cardiologist'
      }
    };

    const enrichedPkSteps = await agent.enrichStepsWithLocationAwareUrls(pkSteps, pkState);
    
    console.log('\nEnriched Steps for Pakistan:');
    enrichedPkSteps.forEach((step, index) => {
      console.log(`\n${index + 1}. ${step.title}`);
      console.log(`   Type: ${step.actionType}`);
      console.log(`   URL: ${step.url}`);
    });

    // Test Case 3: External Link (should not always use web search)
    console.log('\n\nTest Case 3: External Link (General Health Info)');
    console.log('-'.repeat(70));
    
    const externalSteps = [
      {
        title: 'Learn About Hypertension',
        description: 'Read about managing high blood pressure',
        icon: 'info',
        actionType: 'external_link',
        url: 'https://www.mayoclinic.org/diseases-conditions/high-blood-pressure'
      },
      {
        title: 'Find Local Pharmacy',
        description: 'Locate a pharmacy near you',
        icon: 'medication',
        actionType: 'external_link',
        url: null
      }
    ];

    const externalState = {
      userLocation: {
        city: 'London',
        state: 'England',
        country: 'United Kingdom',
        countryCode: 'GB',
        latitude: 51.5074,
        longitude: -0.1278
      },
      condition: {
        name: 'Hypertension',
        requiredSpecialty: 'General Practitioner'
      }
    };

    const enrichedExternalSteps = await agent.enrichStepsWithLocationAwareUrls(externalSteps, externalState);
    
    console.log('\nEnriched External Link Steps:');
    enrichedExternalSteps.forEach((step, index) => {
      console.log(`\n${index + 1}. ${step.title}`);
      console.log(`   Type: ${step.actionType}`);
      console.log(`   URL: ${step.url}`);
      console.log(`   Note: ${step.url.includes('mayoclinic') ? 'Kept original URL' : 'Enhanced with location search'}`);
    });

    // Validation
    console.log('\n\n' + '='.repeat(70));
    console.log('Validation Results:');
    console.log('='.repeat(70));
    
    const allSteps = [...enrichedUsSteps, ...enrichedPkSteps, ...enrichedExternalSteps];
    const stepsWithUrls = allSteps.filter(s => s.url && s.url !== '#');
    const stepsWithoutUrls = allSteps.filter(s => !s.url || s.url === '#');
    
    console.log(`\n✓ Total steps processed: ${allSteps.length}`);
    console.log(`✓ Steps with URLs: ${stepsWithUrls.length}`);
    console.log(`✓ Steps without URLs: ${stepsWithoutUrls.length}`);
    
    if (stepsWithoutUrls.length > 0) {
      console.log('\nSteps without URLs:');
      stepsWithoutUrls.forEach(s => console.log(`  - ${s.title} (${s.actionType})`));
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\nNote: Web search may fail without API keys configured.');
    console.log('Fallback URLs are used when web search is unavailable.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testLocationAwareNextSteps();
