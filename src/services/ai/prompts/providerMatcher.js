/**
 * Provider Matcher Prompts and Instructions
 * Used by the Provider Matcher Agent to find healthcare providers and booking links
 */

const PROVIDER_MATCHER_SYSTEM_PROMPT = `Find healthcare providers and booking links based on specialty and location.

You have access to a web_search tool that can find real-time booking links for healthcare providers.

WHEN TO USE WEB SEARCH:
- Use web_search to find booking links for providers after identifying them
- Use web_search to discover location-specific healthcare booking platforms
- Use web_search when provider website doesn't have direct booking capability

SEARCH QUERY FORMAT FOR PROVIDERS:
Build queries that include:
1. Action keyword: "book appointment" or "schedule appointment"
2. Provider name (if known)
3. Specialty (e.g., "cardiologist", "dermatologist")
4. City and country from user location

GOOD SEARCH QUERY EXAMPLES:
- "book appointment Dr. Sarah Johnson cardiologist Boston USA"
- "schedule appointment dermatologist Lahore Pakistan"
- "book cardiologist appointment Mumbai India online"
- "find cardiologist booking London UK"

SEARCH RESULT PRIORITIZATION:
1. Look for URLs containing booking platforms (Zocdoc, Practo, Marham, Doctolib, HealthEngine, etc.)
2. Prefer URLs with "book", "appointment", "schedule" in the path
3. Use the first relevant result as the booking URL
4. Fall back to provider's website if no booking platform found

LOCATION-AWARE BOOKING PLATFORMS:
- USA: Zocdoc, HealthGrades, Vitals
- Pakistan: Marham.pk, Oladoc
- India: Practo, Doctoralia
- UK: Doctolib, NHS booking
- Australia: HealthEngine, HotDoc

The web search tool will automatically find the most relevant platform for the user's location.`;

/**
 * Format provider search context for logging
 * @param {Object} provider - Provider object
 * @param {Object} location - User location
 * @returns {string} Formatted context
 */
function formatProviderSearchContext(provider, location) {
  let context = `Provider: ${provider.name}\n`;
  context += `Specialty: ${provider.specialty}\n`;
  context += `Location: ${location.city}, ${location.country || location.countryName}\n`;
  
  if (provider.address) {
    context += `Address: ${provider.address}\n`;
  }
  
  return context;
}

/**
 * Build search query for provider booking links
 * @param {Object} provider - Provider object
 * @param {Object} location - User location
 * @returns {string} Optimized search query
 */
function buildProviderBookingQuery(provider, location) {
  const parts = ['book appointment'];
  
  if (provider.name) {
    parts.push(provider.name);
  }
  
  if (provider.specialty) {
    parts.push(provider.specialty);
  }
  
  if (location.city) {
    parts.push(location.city);
  }
  
  if (location.country || location.countryName) {
    parts.push(location.country || location.countryName);
  }
  
  return parts.join(' ');
}

/**
 * Validate booking URL from search results
 * @param {string} url - URL to validate
 * @returns {boolean} Whether URL is valid for booking
 */
function isValidBookingUrl(url) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    
    // Must use HTTPS
    if (urlObj.protocol !== 'https:') {
      return false;
    }
    
    // Check for known booking platforms or booking-related keywords
    const bookingIndicators = [
      'book', 'appointment', 'schedule', 'booking',
      'zocdoc', 'practo', 'marham', 'doctolib', 'healthengine',
      'oladoc', 'doctoruna', 'doctoralia', 'healthgrades',
      'vitals', 'hotdoc', 'nhs'
    ];
    
    const urlLower = url.toLowerCase();
    return bookingIndicators.some(indicator => urlLower.includes(indicator));
  } catch (error) {
    return false;
  }
}

/**
 * Extract best booking URL from search results
 * @param {Array} searchResults - Array of search results
 * @returns {string|null} Best booking URL or null
 */
function extractBestBookingUrl(searchResults) {
  if (!searchResults || searchResults.length === 0) {
    return null;
  }

  // Priority 1: URLs with booking platform domains
  const platformDomains = [
    'zocdoc.com', 'practo.com', 'marham.pk', 'doctolib.',
    'healthengine.com.au', 'oladoc.com', 'doctoralia.com',
    'healthgrades.com', 'vitals.com', 'hotdoc.com.au'
  ];
  
  for (const result of searchResults) {
    const urlLower = result.url.toLowerCase();
    if (platformDomains.some(domain => urlLower.includes(domain))) {
      return result.url;
    }
  }

  // Priority 2: URLs with booking keywords in path
  const bookingKeywords = ['book', 'appointment', 'schedule', 'booking'];
  
  for (const result of searchResults) {
    const urlLower = result.url.toLowerCase();
    if (bookingKeywords.some(keyword => urlLower.includes(keyword))) {
      return result.url;
    }
  }

  // Priority 3: First result
  return searchResults[0].url;
}

module.exports = {
  PROVIDER_MATCHER_SYSTEM_PROMPT,
  formatProviderSearchContext,
  buildProviderBookingQuery,
  isValidBookingUrl,
  extractBestBookingUrl
};
