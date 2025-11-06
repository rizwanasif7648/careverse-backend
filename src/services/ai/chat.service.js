const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');
const config = require('../../config/config');
const logger = require('../../config/logger');

/**
 * Chat AI Service
 * Handles conversational AI for symptom collection and health guidance
 */
class ChatService {
  constructor() {
    this.model = new ChatOpenAI({
      modelName: config.openai.model || 'gpt-4',
      temperature: 0.7,
      openAIApiKey: config.openai.apiKey,
      maxTokens: 500 // Keep responses concise
    });
  }

  /**
   * System prompt that controls AI behavior
   * This ensures AI only responds to Careverse health-related queries
   */
  getSystemPrompt() {
    return `You are Careverse AI, a compassionate and professional healthcare assistant. Your role is to help users understand their symptoms and guide them toward appropriate care.

CORE RESPONSIBILITIES:
- Collect detailed information about symptoms (location, duration, severity, triggers)
- Ask relevant follow-up questions to understand the user's condition
- Show empathy and provide reassurance
- Guide users through symptom assessment
- Suggest when to seek professional medical care

STRICT GUIDELINES:
1. ONLY respond to health and medical-related queries
2. If user asks non-medical questions (weather, sports, general chat), politely redirect: "I'm specifically designed to help with health concerns. How can I assist you with your health today?"
3. NEVER provide definitive diagnoses - always say "possible" or "may indicate"
4. ALWAYS include medical disclaimers when discussing conditions
5. For emergency symptoms (chest pain, difficulty breathing, severe bleeding), immediately advise calling 911
6. Keep responses concise (2-4 sentences) and conversational
7. Ask ONE follow-up question at a time
8. Use simple, non-technical language

CONVERSATION FLOW:
1. Greet warmly and ask about their health concern
2. Gather symptom details through targeted questions
3. Ask about severity, duration, and associated symptoms
4. Once enough information is collected, suggest they can generate a detailed assessment
5. Remind them this is not a substitute for professional medical advice

EMERGENCY RED FLAGS (immediate 911 advice):
- Chest pain or pressure
- Difficulty breathing or shortness of breath
- Sudden severe headache
- Loss of consciousness
- Severe bleeding
- Signs of stroke (face drooping, arm weakness, speech difficulty)
- Severe allergic reaction (throat swelling, difficulty breathing)

Remember: You are a symptom collection assistant, not a doctor. Be helpful, empathetic, and always prioritize user safety.`;
  }

  /**
   * Generate AI response based on conversation history
   * @param {Array} conversationHistory - Array of previous messages
   * @param {string} userMessage - Current user message
   * @returns {Promise<string>} AI response
   */
  async generateResponse(conversationHistory, userMessage) {
    try {
      logger.info('Generating AI chat response', {
        historyLength: conversationHistory.length,
        userMessage: userMessage.substring(0, 50)
      });

      // Build messages array using LangChain message classes
      const messages = [
        new SystemMessage(this.getSystemPrompt())
      ];

      // Add conversation history (limit to last 20 messages for context)
      const recentHistory = conversationHistory.slice(-20);
      recentHistory.forEach(msg => {
        if (msg.role === 'user') {
          messages.push(new HumanMessage(msg.content));
        } else if (msg.role === 'assistant') {
          messages.push(new AIMessage(msg.content));
        }
      });

      // Add current user message
      messages.push(new HumanMessage(userMessage));

      // Call OpenAI
      const startTime = Date.now();
      const response = await this.model.invoke(messages);
      const executionTime = Date.now() - startTime;

      logger.info('AI chat response generated', {
        executionTime,
        responseLength: response.content.length
      });

      return response.content;

    } catch (error) {
      logger.error('Error generating AI chat response:', error);
      
      // Fallback response
      return "I apologize, but I'm having trouble processing your message right now. Please try again in a moment. If you're experiencing a medical emergency, please call 911 immediately.";
    }
  }

  /**
   * Generate initial greeting for new conversation
   * @returns {string} Greeting message
   */
  getInitialGreeting() {
    return "Hello! I'm Careverse AI, your health assistant. I'm here to help you understand your symptoms and guide you toward appropriate care. What brings you here today?";
  }

  /**
   * Check if message indicates emergency
   * @param {string} message - User message
   * @returns {boolean} True if emergency detected
   */
  detectEmergency(message) {
    const emergencyKeywords = [
      'chest pain', 'can\'t breathe', 'difficulty breathing', 'severe bleeding',
      'unconscious', 'stroke', 'heart attack', 'choking', 'severe burn',
      'suicide', 'overdose', 'severe allergic', 'throat swelling'
    ];

    const lowerMessage = message.toLowerCase();
    return emergencyKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Get emergency response
   * @returns {string} Emergency instruction
   */
  getEmergencyResponse() {
    return "⚠️ EMERGENCY: Based on your symptoms, this could be a medical emergency. Please call 911 or go to the nearest emergency room immediately. Do not wait for an online assessment.";
  }

  /**
   * Check if message is a greeting
   * @param {string} message - User message
   * @returns {boolean} True if message is a greeting
   */
  isGreeting(message) {
    const greetings = [
      'hi', 'hello', 'hey', 'good morning', 'good afternoon', 
      'good evening', 'greetings', 'howdy', 'sup', 'yo',
      'hola', 'bonjour', 'ciao', 'namaste'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    
    // Check if message is exactly a greeting or starts with greeting
    return greetings.some(greeting => 
      lowerMessage === greeting || 
      lowerMessage === greeting + '!' ||
      lowerMessage.startsWith(greeting + ' ') ||
      lowerMessage.startsWith(greeting + ',')
    );
  }

  /**
   * Generate smart conversation title based on messages
   * @param {Array} messages - Conversation messages
   * @returns {Promise<string>} Generated title
   */
  async generateConversationTitle(messages) {
    try {
      // Filter to get only user messages with meaningful content
      const userMessages = messages
        .filter(m => m.role === 'user' && !this.isGreeting(m.content))
        .slice(0, 5); // Use first 5 meaningful messages

      if (userMessages.length === 0) {
        return `Conversation - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }

      // Build prompt for title generation
      const conversationText = userMessages
        .map(m => m.content)
        .join('\n');

      const prompt = `Based on this health-related conversation, generate a short, descriptive title (maximum 50 characters). Focus on the main health concern or symptom.

Conversation:
${conversationText}

Generate only the title, nothing else. Keep it concise and professional.`;

      const response = await this.model.invoke([
        new SystemMessage('You are a helpful assistant that generates concise, descriptive titles for health conversations. Return only the title, nothing else.'),
        new HumanMessage(prompt)
      ]);

      let title = response.content.trim();
      
      // Remove quotes if AI added them
      title = title.replace(/^["']|["']$/g, '');
      
      // Ensure it's not too long
      if (title.length > 50) {
        title = title.substring(0, 47) + '...';
      }

      // If title is still generic or empty, use fallback
      if (!title || title.length < 5 || title.toLowerCase().includes('conversation')) {
        return userMessages[0].content.substring(0, 50);
      }

      logger.info('Generated conversation title', { title });
      return title;

    } catch (error) {
      logger.error('Error generating conversation title:', error);
      
      // Fallback: use first meaningful message
      const meaningfulMessage = messages.find(m => 
        m.role === 'user' && !this.isGreeting(m.content)
      );
      
      if (meaningfulMessage) {
        return meaningfulMessage.content.substring(0, 50);
      }
      
      return `Conversation - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
  }
}

module.exports = new ChatService();
