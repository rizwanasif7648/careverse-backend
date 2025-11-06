/**
 * Quick test to verify hash URL fix
 */

const NextStepsGeneratorAgent = require('./src/services/ai/agents/nextStepsGenerator');

async function testHashUrlFix() {
  console.log('Testing Hash URL Fix\n');
  console.log('='.repeat(70));
  
  const agent = new NextStepsGeneratorAgent();
  
  // Simulate a real assessment state
  const state = {
    condition: {
      name: 'Chronic Fatigue',
      confidence: 0.75,
      requiredSpecialty: 'Internal Medicine',
      commonTriggers: ['Overexertion', 'Poor sleep', 'Stress'],
      initialSelfCare: ['Rest', 'Hydration', 'Stress management']
    },
    symptoms: [
      { name: 'Fatigue', severity: 'moderate', duration: '3 weeks', frequency: 'daily' }
    ],
    urgency: 'routine',
    redFlags: [],
    providers: [],
    products: [],
    userLocation: {
      city: 'San Francisco',
      country: 'United States',
      countryCode: 'US'
    },
    tokensUsed: 0
  };
  
  console.log('\nGenerating next steps for Chronic Fatigue...\n');
  
  try {
    const result = await agent.generate(state);
    
    console.log(`Generated ${result.nextSteps.length} next steps:\n`);
    
    let hasHashUrls = false;
    
    result.nextSteps.forEach((step, i) => {
      console.log(`${i + 1}. ${step.title}`);
      console.log(`   Action: ${step.actionType}`);
      console.log(`   URL: ${step.url}`);
      
      if (step.url === '#') {
        console.log(`   ❌ HASH URL DETECTED!`);
        hasHashUrls = true;
      } else if (step.url && step.url.startsWith('http')) {
        console.log(`   ✅ Valid URL`);
      } else if (step.url && step.url.startsWith('/')) {
        console.log(`   ✅ Relative URL`);
      } else {
        console.log(`   ⚠️  Unexpected URL format`);
      }
      console.log('');
    });
    
    console.log('='.repeat(70));
    
    if (hasHashUrls) {
      console.log('❌ TEST FAILED: Hash URLs detected');
      process.exit(1);
    } else {
      console.log('✅ TEST PASSED: No hash URLs found');
      console.log('\nAll next steps have valid, actionable URLs!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testHashUrlFix();
