/**
 * Product Recommendation Function Schema and Prompts
 * Used by the Product Recommender Agent to suggest medications and remedies
 */

const PRODUCT_RECOMMENDATION_SYSTEM_PROMPT = `Recommend safe, effective medications and products for medical conditions.

Prioritize OTC when appropriate. Include prescriptions when needed (mark clearly). Max 8 products.
Types: OTC (pain reliever, anti-inflammatory, antihistamine, decongestant, antacid), Prescription, Supplement, Topical, Medical Device
Be specific (e.g., "Ibuprofen"). Include immediate relief and long-term options. FDA-approved only.`;

const recommendProductsFunction = {
  name: "recommend_products",
  description: "Recommend medications and healthcare products for a medical condition",
  parameters: {
    type: "object",
    properties: {
      products: {
        type: "array",
        description: "List of recommended products for the condition",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Specific product name (e.g., 'Ibuprofen', 'Omeprazole')"
            },
            type: {
              type: "string",
              description: "Category of product (e.g., 'OTC Pain Reliever', 'Prescription Medication')"
            },
            description: {
              type: "string",
              description: "Clear description of what the product does and how it helps"
            },
            isPrescription: {
              type: "boolean",
              description: "Whether this product requires a prescription"
            }
          },
          required: ["name", "type", "description", "isPrescription"]
        }
      }
    },
    required: ["products"]
  }
};

/**
 * Format condition and symptoms for product recommendation
 * @param {Object} condition - Diagnosed condition
 * @param {Array} symptoms - Patient symptoms
 * @returns {string} Formatted prompt for product recommendation
 */
function formatConditionForProducts(condition, symptoms) {
  let prompt = `Medical Condition: ${condition.name}\n\n`;
  prompt += `Description: ${condition.description}\n\n`;
  
  if (symptoms && symptoms.length > 0) {
    prompt += `Primary Symptoms:\n`;
    symptoms.forEach(symptom => {
      prompt += `- ${symptom.name} (${symptom.severity})`;
      if (symptom.location) prompt += ` in ${symptom.location}`;
      prompt += `\n`;
    });
    prompt += `\n`;
  }
  
  if (condition.initialSelfCare && condition.initialSelfCare.length > 0) {
    prompt += `Self-Care Recommendations:\n`;
    condition.initialSelfCare.forEach(care => {
      prompt += `- ${care}\n`;
    });
    prompt += `\n`;
  }
  
  prompt += `Please recommend appropriate medications and healthcare products for this condition. `;
  prompt += `Include both immediate symptom relief and long-term management options. `;
  prompt += `Limit to 8 most important products.`;
  
  return prompt;
}

/**
 * Create messages array for OpenAI API
 * @param {Object} condition - Diagnosed condition
 * @param {Array} symptoms - Patient symptoms
 * @returns {Array} Messages for OpenAI API
 */
function createProductRecommendationMessages(condition, symptoms) {
  return [
    { role: "system", content: PRODUCT_RECOMMENDATION_SYSTEM_PROMPT },
    { role: "user", content: formatConditionForProducts(condition, symptoms) }
  ];
}

/**
 * Validate product recommendations
 * @param {Array} products - Product recommendations
 * @returns {Array} Validated and limited products
 */
function validateProducts(products) {
  // Ensure we don't exceed 8 products
  const validatedProducts = products.slice(0, 8);
  
  // Ensure all required fields are present
  return validatedProducts.map(product => ({
    name: product.name || 'Unknown Product',
    type: product.type || 'Healthcare Product',
    description: product.description || 'Recommended for condition management',
    isPrescription: product.isPrescription === true,
    purchaseUrl: product.purchaseUrl || null,
    imageUrl: product.imageUrl || null
  }));
}

module.exports = {
  PRODUCT_RECOMMENDATION_SYSTEM_PROMPT,
  recommendProductsFunction,
  formatConditionForProducts,
  createProductRecommendationMessages,
  validateProducts
};
