const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const logger = require('../../config/logger');

class SummaryService {
  constructor() {
    this.llm = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || 'gpt-4',
      temperature: 0.3,
      maxTokens: 500,
      openAIApiKey: process.env.OPENAI_API_KEY
    });

    this.summaryPrompt = PromptTemplate.fromTemplate(`
You are a medical conversation summarizer. Summarize the following conversation between a patient and an AI health assistant.

Focus on:
- Main symptoms and concerns discussed
- Key medical information shared
- Important recommendations or advice given
- Any red flags or urgent matters mentioned

Conversation:
{conversation}

Provide a concise, clinical summary in 2-3 paragraphs:
`);
  }

  /**
   * Summarize a conversation from messages
   * @param {Array} messages - Array of message objects with role and content
   * @returns {String} - Summary text
   */
  async summarizeConversation(messages) {
    try {
      if (!messages || messages.length === 0) {
        throw new Error('No messages provided for summarization');
      }

      // Format messages into conversation text
      const conversationText = this.formatMessagesForSummary(messages);

      // Generate summary using LLM
      const formattedPrompt = await this.summaryPrompt.format({
        conversation: conversationText
      });

      const response = await this.llm.invoke(formattedPrompt);
      const summary = response.content.trim();

      logger.info(`Generated summary for ${messages.length} messages`);
      
      return summary;
    } catch (error) {
      logger.error('Error generating conversation summary:', error);
      throw new Error(`Failed to summarize conversation: ${error.message}`);
    }
  }

  /**
   * Format messages into readable conversation text
   * @param {Array} messages - Array of message objects
   * @returns {String} - Formatted conversation
   */
  formatMessagesForSummary(messages) {
    return messages
      .map(msg => {
        const role = msg.role === 'user' ? 'Patient' : 'Assistant';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');
  }

  /**
   * Generate a shorter summary for embedding metadata
   * @param {String} fullSummary - Full summary text
   * @returns {String} - Short summary
   */
  async generateShortSummary(fullSummary) {
    try {
      const shortSummaryPrompt = PromptTemplate.fromTemplate(`
Condense the following medical conversation summary into a single sentence (max 150 characters):

{summary}

One-sentence summary:
`);

      const formattedPrompt = await shortSummaryPrompt.format({
        summary: fullSummary
      });

      const response = await this.llm.invoke(formattedPrompt);
      const shortSummary = response.content.trim();

      return shortSummary.substring(0, 150);
    } catch (error) {
      logger.error('Error generating short summary:', error);
      // Fallback to truncated version
      return fullSummary.substring(0, 150) + '...';
    }
  }

  /**
   * Extract key medical terms from conversation
   * @param {Array} messages - Array of message objects
   * @returns {Array} - Array of key medical terms
   */
  async extractKeyTerms(messages) {
    try {
      const conversationText = this.formatMessagesForSummary(messages);

      const keyTermsPrompt = PromptTemplate.fromTemplate(`
Extract the key medical terms, symptoms, and conditions mentioned in this conversation.
Return only a comma-separated list of terms.

Conversation:
{conversation}

Key terms:
`);

      const formattedPrompt = await keyTermsPrompt.format({
        conversation: conversationText
      });

      const response = await this.llm.invoke(formattedPrompt);
      const termsText = response.content.trim();

      // Parse comma-separated terms
      const terms = termsText
        .split(',')
        .map(term => term.trim())
        .filter(term => term.length > 0)
        .slice(0, 10); // Limit to top 10 terms

      return terms;
    } catch (error) {
      logger.error('Error extracting key terms:', error);
      return [];
    }
  }

  /**
   * Determine conversation severity level
   * @param {Array} messages - Array of message objects
   * @returns {String} - Severity level (low, medium, high, emergency)
   */
  async assessSeverity(messages) {
    try {
      const conversationText = this.formatMessagesForSummary(messages);

      const severityPrompt = PromptTemplate.fromTemplate(`
Assess the medical severity of this conversation. Consider:
- Urgency of symptoms
- Potential health risks
- Need for immediate medical attention

Conversation:
{conversation}

Respond with ONLY ONE WORD: low, medium, high, or emergency

Severity:
`);

      const formattedPrompt = await severityPrompt.format({
        conversation: conversationText
      });

      const response = await this.llm.invoke(formattedPrompt);
      const severity = response.content.trim().toLowerCase();

      // Validate response
      const validSeverities = ['low', 'medium', 'high', 'emergency'];
      if (validSeverities.includes(severity)) {
        return severity;
      }

      return 'medium'; // Default fallback
    } catch (error) {
      logger.error('Error assessing severity:', error);
      return 'medium';
    }
  }
}

module.exports = new SummaryService();
