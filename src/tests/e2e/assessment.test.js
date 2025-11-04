const request = require('supertest');
const { app } = require('../../app');
const { sequelize } = require('../../config/database');
const User = require('../../models/User');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const Assessment = require('../../models/Assessment');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');

describe('Assessment Generation E2E Tests', () => {
  let testUser;
  let authToken;
  let routineConversation;
  let urgentConversation;
  let emergencyConversation;
  let insufficientConversation;

  beforeAll(async () => {
    // Ensure database connection
    await sequelize.authenticate();
    
    // Clean up test data
    await Assessment.destroy({ where: {}, force: true });
    await Message.destroy({ where: {}, force: true });
    await Conversation.destroy({ where: {}, force: true });
    await User.destroy({ where: { email: 'test@assessment.com' }, force: true });
  });

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      email: 'test@assessment.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      location: {
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        latitude: 37.7749,
        longitude: -122.4194
      }
    });

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser.id, email: testUser.email },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    // Create test conversations
    await createTestConversations();
  });

  afterEach(async () => {
    // Clean up after each test
    await Assessment.destroy({ where: {}, force: true });
    await Message.destroy({ where: {}, force: true });
    await Conversation.destroy({ where: {}, force: true });
    await User.destroy({ where: { email: 'test@assessment.com' }, force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  /**
   * Helper function to create test conversations with various scenarios
   */
  async function createTestConversations() {
    // 1. Routine case - Migraine symptoms
    routineConversation = await Conversation.create({
      userId: testUser.id,
      title: 'Headache concerns',
      status: 'active'
    });

    await Message.bulkCreate([
      {
        conversationId: routineConversation.id,
        role: 'user',
        content: 'Hi, I\'ve been having really bad headaches lately.'
      },
      {
        conversationId: routineConversation.id,
        role: 'assistant',
        content: 'I\'m sorry to hear that. Can you tell me more about these headaches? When did they start?'
      },
      {
        conversationId: routineConversation.id,
        role: 'user',
        content: 'They started about a week ago. The pain is usually on one side of my head, and it\'s throbbing. I also feel nauseous and sensitive to light.'
      },
      {
        conversationId: routineConversation.id,
        role: 'assistant',
        content: 'Thank you for sharing that. How often do these headaches occur, and how long do they typically last?'
      },
      {
        conversationId: routineConversation.id,
        role: 'user',
        content: 'They happen about 2-3 times a week and last for several hours, sometimes the whole day. I\'ve noticed they get worse when I\'m stressed at work.'
      }
    ]);

    // 2. Urgent case - Severe allergic reaction
    urgentConversation = await Conversation.create({
      userId: testUser.id,
      title: 'Allergic reaction',
      status: 'active'
    });

    await Message.bulkCreate([
      {
        conversationId: urgentConversation.id,
        role: 'user',
        content: 'I ate something and now I have hives all over my body.'
      },
      {
        conversationId: urgentConversation.id,
        role: 'assistant',
        content: 'I understand. Can you describe the hives? Are you experiencing any other symptoms?'
      },
      {
        conversationId: urgentConversation.id,
        role: 'user',
        content: 'Yes, I have red, itchy welts on my arms, chest, and back. My throat feels a bit tight and I\'m having some difficulty swallowing. I also feel dizzy.'
      },
      {
        conversationId: urgentConversation.id,
        role: 'assistant',
        content: 'This sounds serious. When did you eat the food, and do you know what it was?'
      },
      {
        conversationId: urgentConversation.id,
        role: 'user',
        content: 'About 30 minutes ago. I had shrimp at a restaurant. I\'ve never had a reaction like this before.'
      }
    ]);

    // 3. Emergency case - Chest pain
    emergencyConversation = await Conversation.create({
      userId: testUser.id,
      title: 'Chest pain emergency',
      status: 'active'
    });

    await Message.bulkCreate([
      {
        conversationId: emergencyConversation.id,
        role: 'user',
        content: 'I\'m having severe chest pain right now.'
      },
      {
        conversationId: emergencyConversation.id,
        role: 'assistant',
        content: 'I\'m very concerned about your chest pain. Can you describe it in more detail?'
      },
      {
        conversationId: emergencyConversation.id,
        role: 'user',
        content: 'It\'s a crushing pain in the center of my chest. It started about 10 minutes ago. I\'m also sweating a lot and feel short of breath. The pain is radiating to my left arm.'
      }
    ]);

    // 4. Insufficient data case - Only one user message
    insufficientConversation = await Conversation.create({
      userId: testUser.id,
      title: 'Brief conversation',
      status: 'active'
    });

    await Message.create({
      conversationId: insufficientConversation.id,
      role: 'user',
      content: 'Hello'
    });
  }

  describe('18.2 Test successful assessment generation', () => {
    test('should generate assessment for routine migraine case', async () => {
      const response = await request(app)
        .post('/api/v1/assessments/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ conversationId: routineConversation.id })
        .expect(201);

      // Verify response structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('assessmentId');
      expect(response.body.data).toHaveProperty('possibleCondition');
      expect(response.body.data).toHaveProperty('nextSteps');
      expect(response.body.data).toHaveProperty('severity');
      expect(response.body.data).toHaveProperty('confidence');
      expect(response.body.data).toHaveProperty('disclaimer');

      // Verify possibleCondition structure
      const { possibleCondition } = response.body.data;
      expect(possibleCondition).toHaveProperty('name');
      expect(possibleCondition).toHaveProperty('description');
      expect(possibleCondition).toHaveProperty('commonTriggers');
      expect(possibleCondition).toHaveProperty('initialSelfCare');
      expect(Array.isArray(possibleCondition.commonTriggers)).toBe(true);
      expect(Array.isArray(possibleCondition.initialSelfCare)).toBe(true);

      // Verify nextSteps structure
      const { nextSteps } = response.body.data;
      expect(Array.isArray(nextSteps)).toBe(true);
      expect(nextSteps.length).toBeGreaterThan(0);
      expect(nextSteps.length).toBeLessThanOrEqual(5);
      
      nextSteps.forEach(step => {
        expect(step).toHaveProperty('title');
        expect(step).toHaveProperty('description');
        expect(step).toHaveProperty('icon');
        expect(step).toHaveProperty('actionType');
        expect(['view_providers', 'view_products', 'external_link', 'emergency']).toContain(step.actionType);
      });

      // Verify providers if present
      if (response.body.data.providers) {
        expect(Array.isArray(response.body.data.providers)).toBe(true);
        expect(response.body.data.providers.length).toBeLessThanOrEqual(10);
      }

      // Verify products if present
      if (response.body.data.products) {
        expect(Array.isArray(response.body.data.products)).toBe(true);
        expect(response.body.data.products.length).toBeLessThanOrEqual(8);
      }

      // Verify database record was created
      const assessment = await Assessment.findByPk(response.body.data.assessmentId);
      expect(assessment).not.toBeNull();
      expect(assessment.userId).toBe(testUser.id);
      expect(assessment.conversationId).toBe(routineConversation.id);
      expect(assessment.possibleCondition).toBeTruthy();
      expect(assessment.executionTimeMs).toBeGreaterThan(0);
    }, 30000); // 30 second timeout for API calls

    test('should generate assessment for urgent allergic reaction case', async () => {
      const response = await request(app)
        .post('/api/v1/assessments/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ conversationId: urgentConversation.id })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.severity).toMatch(/high|urgent|emergency/i);
      
      // Verify urgency is reflected in next steps
      const { nextSteps } = response.body.data;
      expect(nextSteps.length).toBeGreaterThan(0);
      
      // Database verification
      const assessment = await Assessment.findByPk(response.body.data.assessmentId);
      expect(assessment).not.toBeNull();
      expect(['urgent', 'emergency']).toContain(assessment.urgency);
    }, 30000);

    test('should generate assessment for emergency chest pain case', async () => {
      const response = await request(app)
        .post('/api/v1/assessments/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ conversationId: emergencyConversation.id })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.severity).toMatch(/emergency/i);
      
      // Verify red flags are detected
      const assessment = await Assessment.findByPk(response.body.data.assessmentId);
      expect(assessment).not.toBeNull();
      expect(assessment.urgency).toBe('emergency');
      expect(assessment.redFlags).toBeDefined();
      expect(Array.isArray(assessment.redFlags)).toBe(true);
      
      // Emergency cases should prioritize urgent care in next steps
      const { nextSteps } = response.body.data;
      expect(nextSteps.length).toBeGreaterThan(0);
      const firstStep = nextSteps[0];
      expect(firstStep.actionType).toMatch(/emergency/i);
    }, 30000);
  });

  describe('18.3 Test error scenarios', () => {
    test('should return 400 for insufficient conversation data', async () => {
      const response = await request(app)
        .post('/api/v1/assessments/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ conversationId: insufficientConversation.id })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/insufficient/i);
    });

    test('should return 404 for non-existent conversation', async () => {
      const fakeConversationId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .post('/api/v1/assessments/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ conversationId: fakeConversationId })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should return 401 for unauthenticated request', async () => {
      await request(app)
        .post('/api/v1/assessments/generate')
        .send({ conversationId: routineConversation.id })
        .expect(401);
    });

    test('should return 403 when accessing another user\'s conversation', async () => {
      // Create another user
      const otherUser = await User.create({
        email: 'other@test.com',
        password: 'Password123!',
        firstName: 'Other',
        lastName: 'User'
      });

      const otherConversation = await Conversation.create({
        userId: otherUser.id,
        title: 'Other user conversation',
        status: 'active'
      });

      await Message.bulkCreate([
        {
          conversationId: otherConversation.id,
          role: 'user',
          content: 'Test message 1'
        },
        {
          conversationId: otherConversation.id,
          role: 'assistant',
          content: 'Test response 1'
        },
        {
          conversationId: otherConversation.id,
          role: 'user',
          content: 'Test message 2'
        }
      ]);

      const response = await request(app)
        .post('/api/v1/assessments/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ conversationId: otherConversation.id })
        .expect(403);

      expect(response.body.success).toBe(false);

      // Cleanup
      await Message.destroy({ where: { conversationId: otherConversation.id } });
      await Conversation.destroy({ where: { id: otherConversation.id } });
      await User.destroy({ where: { id: otherUser.id } });
    });

    test('should handle missing conversationId in request', async () => {
      const response = await request(app)
        .post('/api/v1/assessments/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('18.4 Test assessment retrieval', () => {
    let createdAssessmentId;

    beforeEach(async () => {
      // Generate an assessment first
      const response = await request(app)
        .post('/api/v1/assessments/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ conversationId: routineConversation.id });
      
      createdAssessmentId = response.body.data.assessmentId;
    }, 30000);

    test('should retrieve assessment by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/assessments/${createdAssessmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assessment).toBeDefined();
      expect(response.body.data.assessment.id).toBe(createdAssessmentId);
      expect(response.body.data.assessment.possibleCondition).toBeDefined();
      expect(response.body.data.assessment.nextSteps).toBeDefined();
    });

    test('should verify all fields are present in retrieved assessment', async () => {
      const response = await request(app)
        .get(`/api/v1/assessments/${createdAssessmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { assessment } = response.body.data;
      
      // Verify required fields
      expect(assessment).toHaveProperty('id');
      expect(assessment).toHaveProperty('userId');
      expect(assessment).toHaveProperty('conversationId');
      expect(assessment).toHaveProperty('possibleCondition');
      expect(assessment).toHaveProperty('description');
      expect(assessment).toHaveProperty('severity');
      expect(assessment).toHaveProperty('confidence');
      expect(assessment).toHaveProperty('disclaimer');
      expect(assessment).toHaveProperty('nextSteps');
      expect(assessment).toHaveProperty('createdAt');
      expect(assessment).toHaveProperty('updatedAt');
    });

    test('should enforce ownership validation', async () => {
      // Create another user
      const otherUser = await User.create({
        email: 'other2@test.com',
        password: 'Password123!',
        firstName: 'Other',
        lastName: 'User2'
      });

      const otherToken = jwt.sign(
        { userId: otherUser.id, email: otherUser.email },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      // Try to access the assessment with different user
      const response = await request(app)
        .get(`/api/v1/assessments/${createdAssessmentId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);

      // Cleanup
      await User.destroy({ where: { id: otherUser.id } });
    });

    test('should return 404 for non-existent assessment', async () => {
      const fakeAssessmentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/v1/assessments/${fakeAssessmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should return user\'s assessment list', async () => {
      const response = await request(app)
        .get('/api/v1/assessments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.assessments)).toBe(true);
      expect(response.body.data.assessments.length).toBeGreaterThan(0);
      
      // Verify all assessments belong to the user
      response.body.data.assessments.forEach(assessment => {
        expect(assessment.userId).toBe(testUser.id);
      });
    });
  });

  describe('18.5 Performance testing', () => {
    test('should complete assessment generation within 15 seconds', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/assessments/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ conversationId: routineConversation.id })
        .expect(201);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(executionTime).toBeLessThan(15000); // 15 seconds
      
      // Verify execution time is tracked in database
      const assessment = await Assessment.findByPk(response.body.data.assessmentId);
      expect(assessment.executionTimeMs).toBeDefined();
      expect(assessment.executionTimeMs).toBeGreaterThan(0);
    }, 30000);

    test('should track token usage', async () => {
      const response = await request(app)
        .post('/api/v1/assessments/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ conversationId: routineConversation.id })
        .expect(201);

      const assessment = await Assessment.findByPk(response.body.data.assessmentId);
      
      // Token usage should be tracked
      expect(assessment.tokensUsed).toBeDefined();
      expect(assessment.tokensUsed).toBeGreaterThan(0);
    }, 30000);

    test('should handle concurrent requests', async () => {
      // Create multiple conversations for concurrent testing
      const conversations = [];
      for (let i = 0; i < 3; i++) {
        const conv = await Conversation.create({
          userId: testUser.id,
          title: `Concurrent test ${i}`,
          status: 'active'
        });

        await Message.bulkCreate([
          {
            conversationId: conv.id,
            role: 'user',
            content: 'I have a headache.'
          },
          {
            conversationId: conv.id,
            role: 'assistant',
            content: 'Tell me more about it.'
          },
          {
            conversationId: conv.id,
            role: 'user',
            content: 'It\'s been hurting for 2 days on the right side.'
          }
        ]);

        conversations.push(conv);
      }

      // Send concurrent requests
      const promises = conversations.map(conv =>
        request(app)
          .post('/api/v1/assessments/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ conversationId: conv.id })
      );

      const responses = await Promise.all(promises);

      // Verify all succeeded
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Cleanup
      for (const conv of conversations) {
        await Message.destroy({ where: { conversationId: conv.id } });
        await Conversation.destroy({ where: { id: conv.id } });
      }
    }, 60000); // 60 second timeout for concurrent requests
  });
});
