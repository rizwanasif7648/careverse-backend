/**
 * Next Steps Generation Function Schema and Prompts
 * Used by the Next Steps Generator Agent to create actionable recommendations
 */

const NEXT_STEPS_SYSTEM_PROMPT = `Generate 3-5 actionable next steps for patients based on assessment.

Action types: view_providers, view_products, external_link, emergency
Icons: doctor, medication, emergency, calendar, heart, phone, info, meditation, exercise

WEB SEARCH TOOL FOR LOCATION-SPECIFIC RESOURCES:
You have access to a web_search tool that finds location-specific health resources.

WHEN TO USE WEB SEARCH:
- Use web_search for finding local emergency rooms (emergency action type)
- Use web_search for finding health education resources specific to user's region
- Use web_search for finding local support groups or wellness programs
- DO NOT use web_search for view_providers or view_products (system handles these automatically)

IMPORTANT: The system will automatically find location-specific URLs for your recommendations.
- view_providers: System will search for local provider booking platforms based on user location (leave url empty)
- view_products: System will search for local e-commerce sites based on user location (leave url empty)
- external_link: ALWAYS provide reputable health information URLs (e.g., https://www.mayoclinic.org, https://www.cdc.gov, https://www.webmd.com, https://www.healthline.com). If you cannot provide a specific URL, the system will search for appropriate resources.
- emergency: System will search for nearest emergency rooms based on user location (leave url empty)

SEARCH QUERY FORMAT FOR HEALTH RESOURCES:
Build queries that include:
1. Resource type (e.g., "emergency room", "support group", "health education")
2. Condition or topic (if relevant)
3. City and country from user location

GOOD SEARCH QUERY EXAMPLES:
- "emergency room near me Boston USA"
- "diabetes support group Lahore Pakistan"
- "mental health resources Mumbai India"
- "cardiac rehabilitation center London UK"

WHEN TO USE EXISTING DATA VS WEB SEARCH:
- Use existing data: When providers and products are already available in the assessment
- Use web_search: When you need to find additional local resources not covered by existing data
- Use external_link with known URLs: For general health information (Mayo Clinic, CDC, WebMD, NHS)

Priority by urgency:
- EMERGENCY: immediate care, call 911, ER visit (use web_search for local ER)
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
              description: "URL for the action. REQUIRED for external_link (use reputable sources like Mayo Clinic, CDC, WebMD, Healthline). Optional for other types (system will find location-specific URLs automatically)."
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
        // COMMENTED OUT: Frontend route for provider page
        // Uncomment when frontend is ready
        // if (context.requiredSpecialty) {
        //   enrichedStep.url = `/providers?specialty=${encodeURIComponent(context.requiredSpecialty)}`;
        // }
        
        // For now, keep URL as-is (external link from OpenAI)
        enrichedStep.url = step.url || '#';
        break;
      
      case 'view_products':
        // COMMENTED OUT: Frontend route for products page
        // Uncomment when frontend is ready
        // if (context.conditionName) {
        //   enrichedStep.url = `/products?condition=${encodeURIComponent(context.conditionName)}`;
        // }
        
        // For now, keep URL as-is (external link from OpenAI)
        enrichedStep.url = step.url || '#';
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

/**
 * Build search query for health resources
 * @param {string} resourceType - Type of resource (e.g., "emergency room", "support group")
 * @param {string} condition - Medical condition (optional)
 * @param {Object} location - User location
 * @returns {string} Optimized search query
 */
function buildHealthResourceQuery(resourceType, condition, location) {
  const parts = [];
  
  if (resourceType) {
    parts.push(resourceType);
  }
  
  if (condition) {
    parts.push(condition);
  }
  
  if (location && location.city) {
    parts.push(location.city);
  }
  
  if (location && (location.country || location.countryName)) {
    parts.push(location.country || location.countryName);
  }
  
  return parts.join(' ');
}

/**
 * Determine if web search is needed for a next step
 * @param {string} actionType - Action type of the next step
 * @param {string} url - Existing URL (if any)
 * @returns {boolean} Whether web search should be used
 */
function shouldUseWebSearch(actionType, url) {
  // Don't use web search if URL is already provided
  if (url && url !== '#' && url !== '') {
    return false;
  }
  
  // Use web search for emergency and certain external links
  if (actionType === 'emergency') {
    return true;
  }
  
  // Don't use web search for view_providers and view_products
  // (system handles these automatically)
  if (actionType === 'view_providers' || actionType === 'view_products') {
    return false;
  }
  
  // For external_link, only use web search if no URL provided
  return actionType === 'external_link' && !url;
}

/**
 * Extract best health resource URL from search results
 * @param {Array} searchResults - Array of search results
 * @param {string} resourceType - Type of resource being searched
 * @returns {string|null} Best resource URL or null
 */
function extractBestResourceUrl(searchResults, resourceType) {
  if (!searchResults || searchResults.length === 0) {
    return null;
  }

  // For emergency rooms, prioritize hospital websites
  if (resourceType && resourceType.toLowerCase().includes('emergency')) {
    const hospitalKeywords = ['hospital', 'medical center', 'emergency', 'er'];
    
    for (const result of searchResults) {
      const urlLower = result.url.toLowerCase();
      const titleLower = result.title.toLowerCase();
      
      if (hospitalKeywords.some(keyword => 
        urlLower.includes(keyword) || titleLower.includes(keyword)
      )) {
        return result.url;
      }
    }
  }

  // For support groups, prioritize organization websites
  if (resourceType && resourceType.toLowerCase().includes('support')) {
    const supportKeywords = ['support', 'group', 'community', 'foundation', 'association'];
    
    for (const result of searchResults) {
      const urlLower = result.url.toLowerCase();
      const titleLower = result.title.toLowerCase();
      
      if (supportKeywords.some(keyword => 
        urlLower.includes(keyword) || titleLower.includes(keyword)
      )) {
        return result.url;
      }
    }
  }

  // Default: return first result
  return searchResults[0].url;
}

module.exports = {
  NEXT_STEPS_SYSTEM_PROMPT,
  generateNextStepsFunction,
  formatStateForNextSteps,
  createNextStepsMessages,
  enrichNextStepsWithUrls,
  validateNextSteps,
  buildHealthResourceQuery,
  shouldUseWebSearch,
  extractBestResourceUrl
};
