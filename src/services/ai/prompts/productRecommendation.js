/**
 * Product Recommendation Function Schema and Prompts
 * Used by the Product Recommender Agent to suggest medications and remedies
 */

const PRODUCT_RECOMMENDATION_SYSTEM_PROMPT = `Recommend safe, effective medications and products for medical conditions.

Prioritize OTC when appropriate. Include prescriptions when needed (mark clearly). Max 8 products.
Types: OTC (pain reliever, anti-inflammatory, antihistamine, decongestant, antacid), Prescription, Supplement, Topical, Medical Device
Be specific (e.g., "Ibuprofen"). Include immediate relief and long-term options. FDA-approved only.

WEB SEARCH TOOL FOR PRODUCT LINKS:
You have access to a web_search tool that finds location-specific purchase links for recommended products.

WHEN TO USE WEB SEARCH:
- Use web_search to find purchase links for each recommended product
- Use web_search to discover location-specific e-commerce platforms
- The system will automatically invoke web search after you recommend products

SEARCH QUERY FORMAT FOR PRODUCTS:
Build queries that include:
1. Action keyword: "buy" or "purchase"
2. Product name (specific, e.g., "Ibuprofen 200mg")
3. Product type (e.g., "online", "pharmacy")
4. City and country from user location

GOOD SEARCH QUERY EXAMPLES:
- "buy Ibuprofen 200mg online Boston USA"
- "purchase Omeprazole pharmacy Lahore Pakistan"
- "buy Cetirizine antihistamine Mumbai India"
- "purchase Paracetamol online London UK pharmacy"

LOCATION-AWARE E-COMMERCE PLATFORMS:
- USA: Amazon, CVS, Walgreens, HealthWarehouse
- Pakistan: Dawaai.pk, Sehat.com.pk
- India: 1mg, PharmEasy, Netmeds
- UK: Boots, Superdrug, Pharmacy2U
- Australia: Chemist Warehouse, Priceline Pharmacy

The web search tool will automatically find the most relevant platform for the user's location.`;

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

/**
 * Build search query for product purchase links
 * @param {Object} product - Product object
 * @param {Object} location - User location
 * @returns {string} Optimized search query
 */
function buildProductSearchQuery(product, location) {
  const parts = ['buy'];
  
  if (product.name) {
    parts.push(product.name);
  }
  
  parts.push('online');
  
  if (location && location.city) {
    parts.push(location.city);
  }
  
  if (location && (location.country || location.countryName)) {
    parts.push(location.country || location.countryName);
  }
  
  return parts.join(' ');
}

/**
 * Validate purchase URL from search results
 * @param {string} url - URL to validate
 * @returns {boolean} Whether URL is valid for purchasing
 */
function isValidPurchaseUrl(url) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    
    // Must use HTTPS
    if (urlObj.protocol !== 'https:') {
      return false;
    }
    
    // Check for known e-commerce platforms or purchase-related keywords
    const purchaseIndicators = [
      'buy', 'shop', 'store', 'pharmacy', 'chemist',
      'amazon', 'cvs', 'walgreens', 'dawaai', '1mg',
      'boots', 'superdrug', 'chemist-warehouse', 'pharmeasy',
      'netmeds', 'healthwarehouse', 'sehat'
    ];
    
    const urlLower = url.toLowerCase();
    return purchaseIndicators.some(indicator => urlLower.includes(indicator));
  } catch (error) {
    return false;
  }
}

/**
 * Extract best purchase URL from search results
 * @param {Array} searchResults - Array of search results
 * @returns {string|null} Best purchase URL or null
 */
function extractBestPurchaseUrl(searchResults) {
  if (!searchResults || searchResults.length === 0) {
    return null;
  }

  // Priority 1: URLs with known e-commerce platform domains
  const platformDomains = [
    'amazon.com', 'cvs.com', 'walgreens.com', 'dawaai.pk',
    '1mg.com', 'boots.com', 'superdrug.com', 'chemistwarehouse.com.au',
    'pharmeasy.in', 'netmeds.com', 'healthwarehouse.com',
    'sehat.com.pk', 'priceline.com.au', 'pharmacy2u.co.uk'
  ];
  
  for (const result of searchResults) {
    const urlLower = result.url.toLowerCase();
    if (platformDomains.some(domain => urlLower.includes(domain))) {
      return result.url;
    }
  }

  // Priority 2: URLs with purchase keywords in path
  const purchaseKeywords = ['buy', 'shop', 'product', 'pharmacy', 'store'];
  
  for (const result of searchResults) {
    const urlLower = result.url.toLowerCase();
    if (purchaseKeywords.some(keyword => urlLower.includes(keyword))) {
      return result.url;
    }
  }

  // Priority 3: First result
  return searchResults[0].url;
}

module.exports = {
  PRODUCT_RECOMMENDATION_SYSTEM_PROMPT,
  recommendProductsFunction,
  formatConditionForProducts,
  createProductRecommendationMessages,
  validateProducts,
  buildProductSearchQuery,
  isValidPurchaseUrl,
  extractBestPurchaseUrl
};
