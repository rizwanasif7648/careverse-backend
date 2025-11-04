/**
 * Medical Analysis Function Schema and Prompts
 * Used by the Medical Analyzer Agent to diagnose possible conditions
 */

const MEDICAL_ANALYSIS_SYSTEM_PROMPT = `Analyze symptoms and diagnose possible conditions.

Provide: condition name, description, triggers, self-care tips, required specialty, confidence (0-1)
Confidence: 0.8-1.0 (high), 0.6-0.79 (moderate), 0-0.59 (low)
Specialties: Primary Care, Cardiology, Neurology, Gastroenterology, Dermatology, Orthopedics, Psychiatry, Pulmonology, Endocrinology, Rheumatology, ENT, Urology, Gynecology

Be conservative. Default to Primary Care if uncertain. Prioritize safety.`;

const diagnoseConditionFunction = {
  name: "diagnose_condition",
  description: "Diagnose possible medical condition based on symptoms",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the most likely medical condition"
      },
      description: {
        type: "string",
        description: "Detailed description of the condition, including what it is and how it affects the body"
      },
      commonTriggers: {
        type: "array",
        description: "List of common triggers or factors that cause or worsen this condition",
        items: {
          type: "string"
        }
      },
      initialSelfCare: {
        type: "array",
        description: "Initial self-care recommendations that may help manage symptoms",
        items: {
          type: "string"
        }
      },
      requiredSpecialty: {
        type: "string",
        description: "Medical specialty best suited to treat this condition"
      },
      confidence: {
        type: "number",
        description: "Confidence score from 0.0 to 1.0 indicating diagnostic certainty",
        minimum: 0,
        maximum: 1
      }
    },
    required: ["name", "description", "commonTriggers", "initialSelfCare", "requiredSpecialty", "confidence"]
  }
};

/**
 * Format symptoms for medical analysis
 * @param {Array} symptoms - Extracted symptoms
 * @param {string} urgency - Urgency level
 * @param {Array} redFlags - Red flag symptoms
 * @param {Array} conversationHistory - Optional similar past conversations for context
 * @returns {string} Formatted symptom summary
 */
function formatSymptomsForAnalysis(symptoms, urgency, redFlags, conversationHistory = []) {
  let prompt = `Patient Symptoms:\n\n`;
  
  symptoms.forEach((symptom, index) => {
    prompt += `${index + 1}. ${symptom.name}\n`;
    prompt += `   - Severity: ${symptom.severity}\n`;
    if (symptom.location) prompt += `   - Location: ${symptom.location}\n`;
    if (symptom.duration) prompt += `   - Duration: ${symptom.duration}\n`;
    if (symptom.frequency) prompt += `   - Frequency: ${symptom.frequency}\n`;
    prompt += `\n`;
  });
  
  prompt += `Urgency Level: ${urgency}\n\n`;
  
  if (redFlags && redFlags.length > 0) {
    prompt += `Red Flags Identified:\n`;
    redFlags.forEach(flag => {
      prompt += `- ${flag}\n`;
    });
    prompt += `\n`;
  }
  
  if (conversationHistory && conversationHistory.length > 0) {
    prompt += `Similar Past Cases (for context):\n`;
    conversationHistory.forEach((case_, index) => {
      prompt += `${index + 1}. ${case_.summary || case_.condition || 'Similar symptoms'}\n`;
    });
    prompt += `\n`;
  }
  
  prompt += `Please analyze these symptoms and provide a diagnosis.`;
  
  return prompt;
}

/**
 * Create messages array for OpenAI API
 * @param {Array} symptoms - Extracted symptoms
 * @param {string} urgency - Urgency level
 * @param {Array} redFlags - Red flag symptoms
 * @param {Array} conversationHistory - Optional similar past conversations
 * @returns {Array} Messages for OpenAI API
 */
function createAnalysisMessages(symptoms, urgency, redFlags, conversationHistory = []) {
  return [
    { role: "system", content: MEDICAL_ANALYSIS_SYSTEM_PROMPT },
    { role: "user", content: formatSymptomsForAnalysis(symptoms, urgency, redFlags, conversationHistory) }
  ];
}

module.exports = {
  MEDICAL_ANALYSIS_SYSTEM_PROMPT,
  diagnoseConditionFunction,
  formatSymptomsForAnalysis,
  createAnalysisMessages
};
