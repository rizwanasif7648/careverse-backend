/**
 * Test Next Steps Generator fallback URLs when web search fails
 */

const NextStepsGeneratorAgent = require('./src/services/ai/agents/nextStepsGenerator');

async function testFallbackUrls() {
  console.log('Testing Next Steps Generator - Fallback URLs\n');
  console.log('=' .repeat(70));
  
  const agent = new NextStepsGeneratorAgent();
  
  // Test Case: No location data (should use fallback URLs)
  const state = {
    condition: {
      name: 'Stress and Anxiety',
      confidence: 0.80,
      requiredSpecialty: 'Mental Health',
      commonTriggers: ['Work pressure', 'Life changes'],
      initialSelfCare: [
        'Practice relaxation techniques',
        'Get regular exercise',
        'Maintain sleep schedule'
      ]
    },
    symptoms: [
      {
        name: 'Anxiety',
        severity: 'moderate',
        duration: '2 weeks',
        frequency: 'daily'
      }
    ],
    urgency: 'routine',
    redFlags: [],
    providers: [],
    products: [],
    userLocation: {}, // Empty location to test fallbacks
    tokensUsed: 0
  };
  
  console.log('\nTest Case: Stress and Anxiety (No Location Data)');
  console.log('-'.repeat(70));
  console.log(`Location: Not provided (testing fallback URLs)`);
  console.log(`Condition: ${state.condition.name}`);
  console.log(`Urgency: ${state.urgency}\n`);
  
  try {
    const result = await agent.generate(state);
    
    console.log(`\nGenerated ${result.nextSteps.length} Next Steps:\n`);
    
    let allValid = true;
    const urlTypes = {
      valid: 0,
      hash: 0,
      empty: 0,
      relative: 0
    };
    
    result.nextSteps.forEach((step, index) => {
      console.log(`${index + 1}. ${step.title}`);
      console.log(`   Type: ${step.actionType}`);
      console.log(`   URL: ${step.url || 'NO URL'}`);
      
      if (step.url === '#') {
        console.log(`   ❌ Hash URL (should use fallback)`);
        urlTypes.hash++;
        allValid = false;
      } else if (!step.url || step.url === '') {
        console.log(`   ❌ Empty URL (should use fallback)`);
        urlTypes.empty++;
        allValid = false;
      } else if (step.url.startsWith('http')) {
        console.log(`   ✓ Valid external URL`);
        urlTypes.valid++;
      } else {
        console.log(`   ✓ Relative URL (frontend route)`);
        urlTypes.relative++;
      }
      
      console.log('');
    });
    
    console.log('=' .repeat(70));
    console.log('URL Type Summary:');
    console.log('=' .repeat(70));
    console.log(`Valid external URLs: ${urlTypes.valid}`);
    console.log(`Relative URLs: ${urlTypes.relative}`);
    console.log(`Hash URLs: ${urlTypes.hash}`);
    console.log(`Empty URLs: ${urlTypes.empty}`);
    console.log('');
    
    if (allValid) {
      console.log('✅ PASSED: All steps have valid URLs');
      console.log('\nFallback URLs are working correctly when location data is missing.');
    } else {
      console.log('❌ FAILED: Some steps have invalid URLs');
      console.log('\nFallback URLs should be used when web search fails or location is missing.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testFallbackUrls().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
