/**
 * Symptom Extraction Function Schema and Prompts
 * Used by the Symptom Extractor Agent to extract structured symptom data from conversations
 */

const SYMPTOM_EXTRACTION_SYSTEM_PROMPT = `Extract structured symptom data from patient conversations.

Extract: name, severity (mild/moderate/severe), location, duration, frequency
Urgency: routine (mild, no danger), urgent (needs 24-48h care), emergency (life-threatening)
Red Flags: chest pain, severe breathing difficulty, severe headache, unconsciousness, severe bleeding, stroke signs, severe allergic reaction, mental health crisis

Only extract clearly mentioned symptoms.`;

const extractSymptomsFunction = {
  name: "extract_symptoms",
  description: "Extract structured symptom information from patient conversation",
  parameters: {
    type: "object",
    properties: {
      symptoms: {
        type: "array",
        description: "List of symptoms identified in the conversation",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name of the symptom (e.g., 'headache', 'fever', 'nausea')"
            },
            severity: {
              type: "string",
              enum: ["mild", "moderate", "severe"],
              description: "Severity level of the symptom"
            },
            location: {
              type: "string",
              description: "Body location where symptom occurs (if applicable)"
            },
            duration: {
              type: "string",
              description: "How long the symptom has been present (e.g., '2 days', '1 week')"
            },
            frequency: {
              type: "string",
              description: "How often the symptom occurs (e.g., 'constant', 'intermittent', 'daily')"
            }
          },
          required: ["name", "severity"]
        }
      },
      urgency: {
        type: "string",
        enum: ["routine", "urgent", "emergency"],
        description: "Overall urgency level based on all symptoms"
      },
      redFlags: {
        type: "array",
        description: "List of emergency symptoms or red flags identified",
        items: {
          type: "string"
        }
      }
    },
    required: ["symptoms", "urgency", "redFlags"]
  }
};

/**
 * Format conversation messages for symptom extraction
 * @param {Array} messages - Array of conversation messages
 * @returns {Array} Formatted messages for OpenAI API
 */
function formatMessagesForExtraction(messages) {
  const { truncateMessages } = require('../../utils/tokenCounter');
  
  // Format messages
  const formattedMessages = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
  }));
  
  // Truncate to fit within token limits (reserve tokens for system prompt and function)
  const truncated = truncateMessages(formattedMessages, 2500);
  
  return [
    { role: "system", content: SYMPTOM_EXTRACTION_SYSTEM_PROMPT },
    ...truncated
  ];
}

module.exports = {
  SYMPTOM_EXTRACTION_SYSTEM_PROMPT,
  extractSymptomsFunction,
  formatMessagesForExtraction
};
