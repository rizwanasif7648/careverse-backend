/**
 * Query Performance Testing Script
 * Tests conversation retrieval query performance with and without optimizations
 */

const { Conversation, Message, User } = require('../models');
const logger = require('../config/logger');

class QueryPerformanceTester {
  constructor() {
    this.results = {
      withLimit: { times: [], avg: 0 },
      withoutLimit: { times: [], avg: 0 },
      improvement: 0
    };
  }

  /**
   * Run all performance tests
   */
  async runTests() {
    console.log('\n=== Query Performance Testing ===\n');

    try {
      // Find a test conversation with many messages
      const testConversation = await this.findTestConversation();

      if (!testConversation) {
        console.log('⚠ No suitable test conversation found. Creating test data...');
        const created = await this.createTestData();
        if (!created) {
          console.log('✗ Failed to create test data');
          return;
        }
      }

      console.log(`Using conversation: ${testConversation.id}`);
      console.log(`Total messages: ${testConversation.messageCount}\n`);

      // Test 1: Query with limit (optimized)
      await this.testQueryWithLimit(testConversation.id, testConversation.userId);

      // Test 2: Query without limit (unoptimized)
      await this.testQueryWithoutLimit(testConversation.id, testConversation.userId);

      // Calculate and display results
      this.displayResults();

    } catch (error) {
      console.error('Performance testing failed:', error);
      throw error;
    }
  }

  /**
   * Find a conversation with sufficient messages for testing
   */
  async findTestConversation() {
    try {
      const conversations = await Conversation.findAll({
        attributes: ['id', 'user_id'],
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

      // Find conversation with at least 10 messages
      for (const conv of conversations) {
        if (conv.messages && conv.messages.length >= 10) {
          return {
            id: conv.id,
            userId: conv.user_id,
            messageCount: conv.messages.length
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding test conversation:', error);
      return null;
    }
  }

  /**
   * Create test data if none exists
   */
  async createTestData() {
    try {
      // Find or create a test user
      let user = await User.findOne({ where: { email: 'test@example.com' } });
      
      if (!user) {
        console.log('Creating test user...');
        user = await User.create({
          email: 'test@example.com',
          password: 'test123',
          firstName: 'Test',
          lastName: 'User'
        });
      }

      // Create a test conversation
      console.log('Creating test conversation...');
      const conversation = await Conversation.create({
        userId: user.id,
        title: 'Performance Test Conversation',
        status: 'active'
      });

      // Create 30 test messages
      console.log('Creating test messages...');
      const messages = [];
      for (let i = 0; i < 30; i++) {
        messages.push({
          conversationId: conversation.id,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Test message ${i + 1}: This is a sample message for performance testing.`
        });
      }

      await Message.bulkCreate(messages);

      console.log('✓ Test data created successfully\n');

      return {
        id: conversation.id,
        userId: user.id,
        messageCount: 30
      };
    } catch (error) {
      console.error('Error creating test data:', error);
      return null;
    }
  }

  /**
   * Test query with limit (optimized)
   */
  async testQueryWithLimit(conversationId, userId) {
    console.log('Test 1: Query with LIMIT 20 (Optimized)');
    console.log('----------------------------------------');

    const iterations = 5;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();

      await Conversation.findOne({
        where: {
          id: conversationId,
          userId: userId
        },
        include: [
          {
            model: Message,
            as: 'messages',
            attributes: ['id', 'role', 'content', 'createdAt'],
            limit: 20,
            order: [['createdAt', 'DESC']]
          }
        ]
      });

      const queryTime = Date.now() - startTime;
      times.push(queryTime);
      console.log(`  Iteration ${i + 1}: ${queryTime}ms`);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    this.results.withLimit = { times, avg: avgTime };

    console.log(`  Average: ${avgTime.toFixed(2)}ms`);
    console.log('');
  }

  /**
   * Test query without limit (unoptimized)
   */
  async testQueryWithoutLimit(conversationId, userId) {
    console.log('Test 2: Query without LIMIT (Unoptimized)');
    console.log('------------------------------------------');

    const iterations = 5;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();

      await Conversation.findOne({
        where: {
          id: conversationId,
          userId: userId
        },
        include: [
          {
            model: Message,
            as: 'messages',
            attributes: ['id', 'role', 'content', 'createdAt'],
            order: [['createdAt', 'ASC']]
          }
        ]
      });

      const queryTime = Date.now() - startTime;
      times.push(queryTime);
      console.log(`  Iteration ${i + 1}: ${queryTime}ms`);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    this.results.withoutLimit = { times, avg: avgTime };

    console.log(`  Average: ${avgTime.toFixed(2)}ms`);
    console.log('');
  }

  /**
   * Display test results
   */
  displayResults() {
    console.log('=== Performance Results ===');
    console.log('');
    console.log(`Query with LIMIT 20:    ${this.results.withLimit.avg.toFixed(2)}ms (avg)`);
    console.log(`Query without LIMIT:    ${this.results.withoutLimit.avg.toFixed(2)}ms (avg)`);
    console.log('');

    const improvement = ((this.results.withoutLimit.avg - this.results.withLimit.avg) / this.results.withoutLimit.avg) * 100;
    this.results.improvement = improvement;

    if (improvement > 0) {
      console.log(`✓ Performance improvement: ${improvement.toFixed(1)}% faster with LIMIT`);
    } else {
      console.log(`⚠ No significant performance improvement detected`);
    }

    console.log('');
    console.log('Benefits of LIMIT 20:');
    console.log('  • Faster query execution');
    console.log('  • Reduced memory usage');
    console.log('  • Lower token consumption in AI processing');
    console.log('  • Better scalability for conversations with many messages');
    console.log('');
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new QueryPerformanceTester();
  
  tester.runTests()
    .then(() => {
      console.log('✓ Performance testing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Performance testing failed:', error);
      process.exit(1);
    });
}

module.exports = QueryPerformanceTester;
