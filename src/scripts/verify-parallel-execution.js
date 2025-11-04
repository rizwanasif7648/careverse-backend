/**
 * Parallel Execution Performance Verification Script
 * Measures time savings from parallel agent execution and ensures <15 second total execution time
 */

const { AssessmentOrchestrator } = require('../services/ai/orchestrator');
const { Conversation, Message, User } = require('../models');
const logger = require('../config/logger');

class ParallelExecutionVerifier {
  constructor() {
    this.orchestrator = new AssessmentOrchestrator();
    this.results = {
      parallelExecution: { times: [], avg: 0 },
      sequentialEstimate: { times: [], avg: 0 },
      timeSavings: 0,
      meetsRequirement: false
    };
  }

  /**
   * Run all verification tests
   */
  async runTests() {
    console.log('\n=== Parallel Execution Performance Verification ===\n');

    try {
      // Find or create test conversation
      const testData = await this.getTestConversation();

      if (!testData) {
        console.log('✗ Failed to get test conversation');
        return;
      }

      console.log(`Using conversation: ${testData.conversationId}`);
      console.log(`User: ${testData.userId}\n`);

      // Test 1: Measure parallel execution performance
      await this.testParallelExecution(testData);

      // Test 2: Estimate sequential execution time
      await this.estimateSequentialExecution();

      // Test 3: Calculate time savings
      this.calculateTimeSavings();

      // Test 4: Verify <15 second requirement
      this.verifyTimeRequirement();

      // Display results
      this.displayResults();

      return this.results;
    } catch (error) {
      console.error('Verification failed:', error);
      throw error;
    }
  }

  /**
   * Get or create a test conversation
   */
  async getTestConversation() {
    try {
      // Find an existing conversation with sufficient messages
      const conversations = await Conversation.findAll({
        include: [
          {
            model: Message,
            as: 'messages',
            attributes: ['id']
          }
        ],
        limit: 10,
        order: [['created_at', 'DESC']]
      });

      // Find conversation with at least 5 messages
      for (const conv of conversations) {
        if (conv.messages && conv.messages.length >= 5) {
          return {
            conversationId: conv.id,
            userId: conv.user_id
          };
        }
      }

      // Create test data if none exists
      console.log('Creating test conversation...');
      return await this.createTestConversation();
    } catch (error) {
      console.error('Error getting test conversation:', error);
      return null;
    }
  }

  /**
   * Create a test conversation with sample health data
   */
  async createTestConversation() {
    try {
      // Find or create test user
      let user = await User.findOne({ where: { email: 'perf-test@example.com' } });
      
      if (!user) {
        user = await User.create({
          email: 'perf-test@example.com',
          password: 'test123',
          firstName: 'Performance',
          lastName: 'Test',
          location: {
            lat: 37.7749,
            lng: -122.4194,
            city: 'San Francisco',
            state: 'CA'
          }
        });
      }

      // Create conversation
      const conversation = await Conversation.create({
        userId: user.id,
        title: 'Performance Test - Headache Symptoms',
        status: 'active'
      });

      // Create realistic health conversation messages
      const messages = [
        {
          conversationId: conversation.id,
          role: 'user',
          content: 'I\'ve been having severe headaches for the past 3 days.'
        },
        {
          conversationId: conversation.id,
          role: 'assistant',
          content: 'I\'m sorry to hear that. Can you tell me more about these headaches? Where do you feel the pain?'
        },
        {
          conversationId: conversation.id,
          role: 'user',
          content: 'The pain is mostly on the right side of my head, around my temple. It\'s throbbing and gets worse with light.'
        },
        {
          conversationId: conversation.id,
          role: 'assistant',
          content: 'That sounds uncomfortable. Have you experienced any other symptoms like nausea, sensitivity to sound, or visual disturbances?'
        },
        {
          conversationId: conversation.id,
          role: 'user',
          content: 'Yes, I feel nauseous and sometimes see flashing lights before the headache starts. It usually lasts 4-6 hours.'
        },
        {
          conversationId: conversation.id,
          role: 'assistant',
          content: 'These symptoms suggest you might be experiencing migraines. Have you noticed any triggers like stress, certain foods, or lack of sleep?'
        },
        {
          conversationId: conversation.id,
          role: 'user',
          content: 'I\'ve been very stressed at work lately and haven\'t been sleeping well. Could that be causing this?'
        },
        {
          conversationId: conversation.id,
          role: 'assistant',
          content: 'Yes, stress and lack of sleep are common migraine triggers. Let me generate a comprehensive assessment for you.'
        }
      ];

      await Message.bulkCreate(messages);

      console.log('✓ Test conversation created\n');

      return {
        conversationId: conversation.id,
        userId: user.id
      };
    } catch (error) {
      console.error('Error creating test conversation:', error);
      return null;
    }
  }

  /**
   * Test 1: Measure parallel execution performance
   */
  async testParallelExecution(testData) {
    console.log('Test 1: Parallel Execution Performance');
    console.log('---------------------------------------');

    const iterations = 3;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      console.log(`Running iteration ${i + 1}/${iterations}...`);
      
      const startTime = Date.now();

      try {
        await this.orchestrator.generateAssessment(
          testData.conversationId,
          testData.userId,
          30000 // 30 second timeout
        );

        const executionTime = Date.now() - startTime;
        times.push(executionTime);
        
        console.log(`  ✓ Completed in ${(executionTime / 1000).toFixed(2)}s`);
      } catch (error) {
        console.log(`  ✗ Failed: ${error.message}`);
        // Use a high time for failed attempts
        times.push(30000);
      }

      // Wait between iterations to avoid rate limiting
      if (i < iterations - 1) {
        console.log('  Waiting 5 seconds before next iteration...');
        await this.sleep(5000);
      }
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    this.results.parallelExecution = { times, avg: avgTime };

    console.log(`\nAverage execution time: ${(avgTime / 1000).toFixed(2)}s`);
    console.log('');
  }

  /**
   * Test 2: Estimate sequential execution time
   */
  async estimateSequentialExecution() {
    console.log('Test 2: Sequential Execution Estimate');
    console.log('--------------------------------------');

    // Based on typical agent execution times
    const agentTimes = {
      symptomExtractor: 2000,      // 2 seconds
      medicalAnalyzer: 2500,       // 2.5 seconds
      providerMatcher: 3000,       // 3 seconds (with DB + API calls)
      productRecommender: 2500,    // 2.5 seconds (with API call)
      nextStepsGenerator: 1500     // 1.5 seconds
    };

    // Sequential execution: all agents run one after another
    const sequentialTime = Object.values(agentTimes).reduce((a, b) => a + b, 0);

    // Parallel execution: symptomExtractor + medicalAnalyzer run first,
    // then providerMatcher and productRecommender run in parallel,
    // then nextStepsGenerator
    const parallelTime = 
      agentTimes.symptomExtractor +
      agentTimes.medicalAnalyzer +
      Math.max(agentTimes.providerMatcher, agentTimes.productRecommender) +
      agentTimes.nextStepsGenerator;

    console.log('Estimated agent execution times:');
    console.log(`  Symptom Extractor:     ${agentTimes.symptomExtractor}ms`);
    console.log(`  Medical Analyzer:      ${agentTimes.medicalAnalyzer}ms`);
    console.log(`  Provider Matcher:      ${agentTimes.providerMatcher}ms`);
    console.log(`  Product Recommender:   ${agentTimes.productRecommender}ms`);
    console.log(`  Next Steps Generator:  ${agentTimes.nextStepsGenerator}ms`);
    console.log('');
    console.log(`Sequential execution:  ${(sequentialTime / 1000).toFixed(2)}s`);
    console.log(`Parallel execution:    ${(parallelTime / 1000).toFixed(2)}s`);
    console.log('');

    this.results.sequentialEstimate = {
      times: [sequentialTime],
      avg: sequentialTime
    };
  }

  /**
   * Test 3: Calculate time savings
   */
  calculateTimeSavings() {
    console.log('Test 3: Time Savings Calculation');
    console.log('---------------------------------');

    const parallelAvg = this.results.parallelExecution.avg;
    const sequentialAvg = this.results.sequentialEstimate.avg;

    const timeSavings = ((sequentialAvg - parallelAvg) / sequentialAvg) * 100;
    this.results.timeSavings = timeSavings;

    console.log(`Parallel execution:    ${(parallelAvg / 1000).toFixed(2)}s`);
    console.log(`Sequential estimate:   ${(sequentialAvg / 1000).toFixed(2)}s`);
    console.log(`Time savings:          ${timeSavings.toFixed(1)}%`);
    console.log('');

    if (timeSavings > 30) {
      console.log(`✓ Excellent time savings (>${30}%)`);
    } else if (timeSavings > 20) {
      console.log(`✓ Good time savings (>${20}%)`);
    } else if (timeSavings > 0) {
      console.log(`⚠ Modest time savings (${timeSavings.toFixed(1)}%)`);
    } else {
      console.log(`✗ No time savings detected`);
    }
    console.log('');
  }

  /**
   * Test 4: Verify <15 second requirement
   */
  verifyTimeRequirement() {
    console.log('Test 4: 15-Second Requirement Verification');
    console.log('-------------------------------------------');

    const avgTime = this.results.parallelExecution.avg;
    const maxTime = Math.max(...this.results.parallelExecution.times);
    const requirement = 15000; // 15 seconds in milliseconds

    console.log(`Average execution time: ${(avgTime / 1000).toFixed(2)}s`);
    console.log(`Maximum execution time: ${(maxTime / 1000).toFixed(2)}s`);
    console.log(`Requirement:            ${(requirement / 1000).toFixed(2)}s`);
    console.log('');

    if (avgTime < requirement) {
      console.log(`✓ Average time meets requirement (${(avgTime / 1000).toFixed(2)}s < 15s)`);
      this.results.meetsRequirement = true;
    } else {
      console.log(`✗ Average time exceeds requirement (${(avgTime / 1000).toFixed(2)}s >= 15s)`);
      this.results.meetsRequirement = false;
    }

    if (maxTime < requirement) {
      console.log(`✓ Maximum time meets requirement (${(maxTime / 1000).toFixed(2)}s < 15s)`);
    } else {
      console.log(`⚠ Maximum time exceeds requirement (${(maxTime / 1000).toFixed(2)}s >= 15s)`);
    }
    console.log('');
  }

  /**
   * Display comprehensive results
   */
  displayResults() {
    console.log('=== Performance Summary ===');
    console.log('');
    console.log('Parallel Execution:');
    console.log(`  Average: ${(this.results.parallelExecution.avg / 1000).toFixed(2)}s`);
    console.log(`  Min:     ${(Math.min(...this.results.parallelExecution.times) / 1000).toFixed(2)}s`);
    console.log(`  Max:     ${(Math.max(...this.results.parallelExecution.times) / 1000).toFixed(2)}s`);
    console.log('');
    console.log(`Time Savings: ${this.results.timeSavings.toFixed(1)}%`);
    console.log(`Meets <15s Requirement: ${this.results.meetsRequirement ? '✓ YES' : '✗ NO'}`);
    console.log('');

    if (this.results.meetsRequirement && this.results.timeSavings > 20) {
      console.log('✓ All performance requirements met!');
    } else if (this.results.meetsRequirement) {
      console.log('✓ Time requirement met, but parallel execution could be optimized further');
    } else {
      console.log('✗ Performance optimization needed');
      console.log('');
      console.log('Recommendations:');
      console.log('  • Enable Redis caching for provider and product searches');
      console.log('  • Optimize database queries with proper indexes');
      console.log('  • Reduce conversation history to last 20 messages');
      console.log('  • Use concise system prompts to reduce token processing time');
      console.log('  • Consider using faster OpenAI models or endpoints');
    }
    console.log('');
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run verification if executed directly
if (require.main === module) {
  const verifier = new ParallelExecutionVerifier();
  
  verifier.runTests()
    .then((results) => {
      const exitCode = results && results.meetsRequirement ? 0 : 1;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('Verification script failed:', error);
      process.exit(1);
    });
}

module.exports = ParallelExecutionVerifier;
