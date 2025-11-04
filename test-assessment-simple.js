/**
 * Simple Assessment Test Script
 * Run with: node test-assessment-simple.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';

// Test scenarios
const SCENARIOS = {
  migraine: {
    title: 'Migraine Symptoms',
    messages: [
      "I've been having really bad headaches lately.",
      "The pain is usually on one side of my head, and it's throbbing. I also feel nauseous and sensitive to light.",
      "They happen about 2-3 times a week and last for several hours. They get worse when I'm stressed at work."
    ]
  },
  allergic: {
    title: 'Allergic Reaction',
    messages: [
      "I ate something and now I have hives all over my body.",
      "I have red, itchy welts on my arms, chest, and back. My throat feels a bit tight and I'm having some difficulty swallowing.",
      "I had shrimp at a restaurant about 30 minutes ago. I've never had a reaction like this before."
    ]
  },
  emergency: {
    title: 'Chest Pain Emergency',
    messages: [
      "I'm having severe chest pain right now.",
      "It's a crushing pain in the center of my chest. I'm also sweating a lot and feel short of breath.",
      "The pain is radiating to my left arm."
    ]
  }
};

let token = '';

async function register() {
  console.log('📝 Registering user...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      firstName: 'Test',
      lastName: 'User'
    });
    console.log('✅ User registered');
    return response.data;
  } catch (error) {
    if (error.response?.data?.message?.includes('already exists')) {
      console.log('ℹ️  User already exists, proceeding to login');
      return null;
    }
    throw error;
  }
}

async function login() {
  console.log('🔐 Logging in...');
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });
  token = response.data.data.token;
  console.log('✅ Logged in successfully');
  console.log(`   Token: ${token.substring(0, 20)}...`);
  return token;
}

async function createConversation(title) {
  console.log(`\n💬 Creating conversation: "${title}"...`);
  const response = await axios.post(
    `${BASE_URL}/chat/conversations`,
    { title },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const conversationId = response.data.data.conversation.id;
  console.log(`✅ Conversation created: ${conversationId}`);
  return conversationId;
}

async function addMessage(conversationId, content) {
  await axios.post(
    `${BASE_URL}/chat/conversations/${conversationId}/messages`,
    { content },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log(`   ✅ Added: "${content.substring(0, 60)}..."`);
}

async function generateAssessment(conversationId) {
  console.log('\n🤖 Generating assessment...');
  console.log('   ⏳ This may take 5-15 seconds...');
  
  const startTime = Date.now();
  const response = await axios.post(
    `${BASE_URL}/assessments/generate`,
    { conversationId },
    { 
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000 // 30 second timeout
    }
  );
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log(`✅ Assessment generated in ${duration}s`);
  return { ...response.data.data, duration };
}

async function displayAssessment(assessment) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 ASSESSMENT RESULTS');
  console.log('='.repeat(80));
  
  console.log(`\n🆔 Assessment ID: ${assessment.assessmentId}`);
  console.log(`⏱️  Generation Time: ${assessment.duration}s`);
  console.log(`📊 Severity: ${assessment.severity}`);
  console.log(`🎯 Confidence: ${assessment.confidence}`);
  
  if (assessment.possibleCondition) {
    console.log(`\n🏥 Possible Condition: ${assessment.possibleCondition.name}`);
    console.log(`   Description: ${assessment.possibleCondition.description}`);
    
    if (assessment.possibleCondition.commonTriggers?.length > 0) {
      console.log(`   Common Triggers:`);
      assessment.possibleCondition.commonTriggers.forEach(trigger => {
        console.log(`     • ${trigger}`);
      });
    }
  }
  
  if (assessment.nextSteps?.length > 0) {
    console.log(`\n📝 Next Steps (${assessment.nextSteps.length}):`);
    assessment.nextSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step.title}`);
      console.log(`      ${step.description}`);
      console.log(`      Action: ${step.actionType}`);
    });
  }
  
  if (assessment.providers?.length > 0) {
    console.log(`\n🏥 Healthcare Providers (${assessment.providers.length}):`);
    assessment.providers.slice(0, 3).forEach((provider, index) => {
      console.log(`   ${index + 1}. ${provider.name}`);
      console.log(`      ${provider.address}`);
      if (provider.distance) {
        console.log(`      Distance: ${provider.distance.toFixed(1)} miles`);
      }
    });
  }
  
  if (assessment.products?.length > 0) {
    console.log(`\n💊 Product Recommendations (${assessment.products.length}):`);
    assessment.products.slice(0, 3).forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name}`);
      console.log(`      ${product.description}`);
    });
  }
  
  console.log(`\n⚠️  Disclaimer: ${assessment.disclaimer}`);
  console.log('='.repeat(80) + '\n');
}

async function testScenario(scenarioName) {
  const scenario = SCENARIOS[scenarioName];
  
  console.log('\n' + '='.repeat(80));
  console.log(`🧪 TESTING SCENARIO: ${scenario.title.toUpperCase()}`);
  console.log('='.repeat(80));
  
  try {
    // Create conversation
    const conversationId = await createConversation(scenario.title);
    
    // Add messages
    console.log('\n📨 Adding messages...');
    for (const message of scenario.messages) {
      await addMessage(conversationId, message);
    }
    
    // Generate assessment
    const assessment = await generateAssessment(conversationId);
    
    // Display results
    await displayAssessment(assessment);
    
    return { success: true, assessment };
  } catch (error) {
    console.error(`\n❌ Error in scenario "${scenarioName}":`, error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n' + '🚀 '.repeat(40));
  console.log('   AI ASSESSMENT GENERATION - MANUAL TEST');
  console.log('🚀 '.repeat(40) + '\n');
  
  try {
    // Setup
    await register();
    await login();
    
    // Get scenario from command line or use default
    const scenarioName = process.argv[2] || 'migraine';
    
    if (!SCENARIOS[scenarioName]) {
      console.log(`\n❌ Unknown scenario: ${scenarioName}`);
      console.log('\nAvailable scenarios:');
      Object.keys(SCENARIOS).forEach(name => {
        console.log(`  - ${name}: ${SCENARIOS[name].title}`);
      });
      console.log('\nUsage: node test-assessment-simple.js [scenario]');
      console.log('Example: node test-assessment-simple.js emergency');
      process.exit(1);
    }
    
    // Run test
    const result = await testScenario(scenarioName);
    
    if (result.success) {
      console.log('✅ Test completed successfully!\n');
      console.log('💡 Try other scenarios:');
      Object.keys(SCENARIOS).forEach(name => {
        if (name !== scenarioName) {
          console.log(`   node test-assessment-simple.js ${name}`);
        }
      });
    } else {
      console.log('❌ Test failed\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the test
main();
