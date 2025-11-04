/**
 * Next Steps Generation Function Schema and Prompts
 * Used by the Next Steps Generator Agent to create actionable recommendations
 */

const NEXT_STEPS_SYSTEM_PROMPT = `Generate 3-5 actionable next steps for patients based on assessment.

Action types: view_providers, view_products, external_link, emergency
Icons: doctor, medication, emergency, calendar, heart, phone, info, meditation, exercise

Priority by urgency:
- EMERGENCY: immediate care, call 911, ER visit
- URGENT: urgent care, same-day appointment, monitor symptoms
- ROUTINE: specialist appointment, explore treatments, lifestyle changes, wellness programs

Keep titles under 50 chars. Be specific and helpful.`;

const generateNextStepsFunction = {
  name: "generate_next_steps",
  description: "Generate actionable next steps for patient based on their assessment",
  parameters: {
    type: "object",
    properties: {
      nextSteps: {
        type: "array",
        description: "List of 3-5 actionable next steps in priority order",
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Clear, concise title for the action (under 50 characters)"
            },
            description: {
              type: "string",
              description: "Detailed description of what the user should do and why"
            },
            icon: {
              type: "string",
              enum: ["doctor", "medication", "emergency", "calendar", "heart", "phone", "info", "meditation", "exercise"],
              description: "Icon identifier for UI display"
            },
            actionType: {
              type: "string",
              enum: ["view_providers", "view_products", "external_link", "emergency"],
              description: "Type of action this step represents"
            },
            url: {
              type: "string",
              description: "URL for external links (optional, will be set by system for view_providers and view_products)"
            }
          },
          required: ["title", "description", "icon", "actionType"]
        }
      }
    },
    required: ["nextSteps"]
  }
};

/**
 * Format assessment state for next steps generation
 * @param {Object} state - Complete assessment state
 * @returns {string} Formatted prompt for next steps generation
 */
function formatStateForNextSteps(state) {
  let prompt = `Patient Assessment Summary:\n\n`;
  
  // Condition
  prompt += `Condition: ${state.condition.name}\n`;
  prompt += `Confidence: ${(state.condition.confidence * 100).toFixed(0)}%\n`;
  prompt += `Required Specialty: ${state.condition.requiredSpecialty}\n`;
  prompt += `Urgency: ${state.urgency}\n\n`;
  
  // Symptoms
  if (state.symptoms && state.symptoms.length > 0) {
    prompt += `Symptoms:\n`;
    state.symptoms.forEach(symptom => {
      prompt += `- ${symptom.name} (${symptom.severity})`;
      if (symptom.duration) prompt += ` for ${symptom.duration}`;
      prompt += `\n`;
    });
    prompt += `\n`;
  }
  
  // Red flags
  if (state.redFlags && state.redFlags.length > 0) {
    prompt += `Red Flags:\n`;
    state.redFlags.forEach(flag => {
      prompt += `- ${flag}\n`;
    });
    prompt += `\n`;
  }
  
  // Available resources
  const hasProviders = state.providers && state.providers.length > 0;
  const hasProducts = state.products && state.products.length > 0;
  
  prompt += `Available Resources:\n`;
  prompt += `- Healthcare Providers: ${hasProviders ? 'Available' : 'Not found'}\n`;
  prompt += `- Recommended Products: ${hasProducts ? 'Available' : 'Not found'}\n\n`;
  
  // Self-care recommendations
  if (state.condition.initialSelfCare && state.condition.initialSelfCare.length > 0) {
    prompt += `Self-Care Recommendations:\n`;
    state.condition.initialSelfCare.forEach(care => {
      prompt += `- ${care}\n`;
    });
    prompt += `\n`;
  }
  
  prompt += `Please generate 3-5 actionable next steps for this patient. `;
  prompt += `Prioritize based on urgency level and available resources. `;
  
  if (state.urgency === 'emergency') {
    prompt += `This is an EMERGENCY - prioritize immediate medical care.`;
  } else if (state.urgency === 'urgent') {
    prompt += `This is URGENT - prioritize prompt medical attention.`;
  } else {
    prompt += `Include specialist booking, treatment exploration, and wellness recommendations as appropriate.`;
  }
  
  return prompt;
}

/**
 * Create messages array for OpenAI API
 * @param {Object} state - Complete assessment state
 * @returns {Array} Messages for OpenAI API
 */
function createNextStepsMessages(state) {
  return [
    { role: "system", content: NEXT_STEPS_SYSTEM_PROMPT },
    { role: "user", content: formatStateForNextSteps(state) }
  ];
}

/**
 * Enrich next steps with URLs based on action type
 * @param {Array} nextSteps - Generated next steps
 * @param {Object} context - Context with condition and specialty info
 * @returns {Array} Next steps with URLs added
 */
function enrichNextStepsWithUrls(nextSteps, context) {
  return nextSteps.map(step => {
    const enrichedStep = { ...step };
    
    switch (step.actionType) {
      case 'view_providers':
        if (context.requiredSpecialty) {
          enrichedStep.url = `/providers?specialty=${encodeURIComponent(context.requiredSpecialty)}`;
        }
        break;
      
      case 'view_products':
        if (context.conditionName) {
          enrichedStep.url = `/products?condition=${encodeURIComponent(context.conditionName)}`;
        }
        break;
      
      case 'emergency':
        enrichedStep.url = step.url || '/emergency-care';
        break;
      
      case 'external_link':
        // URL should be provided in the step already
        enrichedStep.url = step.url || '#';
        break;
    }
    
    return enrichedStep;
  });
}

/**
 * Validate next steps
 * @param {Array} nextSteps - Generated next steps
 * @returns {Array} Validated next steps (3-5 items)
 */
function validateNextSteps(nextSteps) {
  // Ensure we have 3-5 steps
  let validatedSteps = nextSteps.slice(0, 5);
  
  if (validatedSteps.length < 3 && validatedSteps.length > 0) {
    // If we have fewer than 3, that's okay but log it
    console.warn(`Only ${validatedSteps.length} next steps generated (expected 3-5)`);
  }
  
  // Ensure all required fields are present
  return validatedSteps.map(step => ({
    title: step.title || 'Next Step',
    description: step.description || 'Follow up on your health',
    icon: step.icon || 'info',
    actionType: step.actionType || 'external_link',
    url: step.url || null
  }));
}

module.exports = {
  NEXT_STEPS_SYSTEM_PROMPT,
  generateNextStepsFunction,
  formatStateForNextSteps,
  createNextStepsMessages,
  enrichNextStepsWithUrls,
  validateNextSteps
};
