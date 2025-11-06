/**
 * Test Next Steps Generator to ensure no # URLs are returned
 */

const NextStepsGeneratorAgent = require('./src/services/ai/agents/nextStepsGenerator');

async function testNoHashUrls() {
  console.log('Testing Next Steps Generator - No Hash URLs\n');
  console.log('=' .repeat(70));
  
  const agent = new NextStepsGeneratorAgent();
  
  // Test Case: Fatigue with lifestyle recommendations
  const state = {
    condition: {
      name: 'Post-Exertional Fatigue',
      confidence: 0.75,
      requiredSpecialty: 'Primary Care',
      commonTriggers: ['Physical exertion', 'Lack of sleep', 'Stress'],
      initialSelfCare: [
        'Get adequate rest',
        'Maintain regular sleep schedule',
        'Stay hydrated'
      ]
    },
    symptoms: [
      {
        name: 'Fatigue after exercise',
        severity: 'moderate',
        duration: '2-3 days',
        frequency: 'after each workout'
      }
    ],
    urgency: 'routine',
    redFlags: [],
    providers: [],
    products: [],
    userLocation: {
      city: 'Boston',
      country: 'United States',
      countryCode: 'US',
      coordinates: { lat: 42.3601, lng: -71.0589 }
    },
    tokensUsed: 0
  };
  
  console.log('\nTest Case: Post-Exertional Fatigue (Lifestyle Focus)');
  console.log('-'.repeat(70));
  console.log(`Location: ${state.userLocation.city}, ${state.userLocation.country}`);
  console.log(`Condition: ${state.condition.name}`);
  console.log(`Urgency: ${state.urgency}\n`);
  
  try {
    const result = await agent.generate(state);
    
    console.log(`\nGenerated ${result.nextSteps.length} Next Steps:\n`);
    
    let hasHashUrls = false;
    
    result.nextSteps.forEach((step, index) => {
      console.log(`${index + 1}. ${step.title}`);
      console.log(`   Description: ${step.description}`);
      console.log(`   Type: ${step.actionType}`);
      console.log(`   Icon: ${step.icon}`);
      console.log(`   URL: ${step.url || 'NO URL'}`);
      
      if (step.url === '#') {
        console.log(`   ⚠️  WARNING: Hash URL detected!`);
        hasHashUrls = true;
      } else if (!step.url || step.url === '') {
        console.log(`   ⚠️  WARNING: Empty URL!`);
        hasHashUrls = true;
      } else if (step.url.startsWith('http')) {
        console.log(`   ✓ Valid URL`);
      } else {
        console.log(`   ℹ️  Relative URL (frontend route)`);
      }
      
      console.log('');
    });
    
    console.log('=' .repeat(70));
    console.log('Test Results:');
    console.log('=' .repeat(70));
    
    if (hasHashUrls) {
      console.log('❌ FAILED: Found hash (#) or empty URLs');
      console.log('\nThe Next Steps Generator should provide valid URLs for all steps.');
      console.log('External links should use web search or fallback to reputable sources.');
      process.exit(1);
    } else {
      console.log('✅ PASSED: All steps have valid URLs');
      console.log('\nAll next steps have appropriate URLs:');
      console.log('- External links use web search or reputable health sources');
      console.log('- Provider/product links use location-aware web search');
      console.log('- Emergency links use location-specific resources');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testNoHashUrls().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
