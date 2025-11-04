/**
 * Google Places API Service Wrapper
 * Provides methods to search for healthcare providers and get place details
 */

const axios = require('axios');
const config = require('../../../config/config');
const logger = require('../../../config/logger');

class GooglePlacesService {
  constructor() {
    this.apiKey = config.googlePlaces.apiKey;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
    this.maxRetries = 2;
    this.requestDelay = 100; // Rate limiting delay in ms
    this.lastRequestTime = 0;
  }

  /**
   * Search for healthcare providers using Google Places API
   * @param {Object} params - Search parameters
   * @param {string} params.specialty - Medical specialty to search for
   * @param {Object} params.location - Location coordinates {lat, lng}
   * @param {number} params.radius - Search radius in meters (default: 40234 = 25 miles)
   * @returns {Promise<Array>} Array of provider objects
   */
  async searchProviders({ specialty, location, radius = 40234 }) {
    if (!this.apiKey) {
      logger.warn('Google Places API key not configured, skipping search');
      return [];
    }

    logger.info('GooglePlacesService: Searching for providers', {
      specialty,
      location,
      radius
    });

    try {
      await this.rateLimit();

      // Construct search query
      const query = `${specialty} doctor near me`;
      
      const response = await axios.get(`${this.baseUrl}/textsearch/json`, {
        params: {
          query,
          location: `${location.lat},${location.lng}`,
          radius,
          type: 'doctor',
          key: this.apiKey
        },
        timeout: 10000
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        logger.error('Google Places API error', {
          status: response.data.status,
          errorMessage: response.data.error_message
        });
        return [];
      }

      const results = response.data.results || [];
      
      logger.info('GooglePlacesService: Search completed', {
        resultCount: results.length
      });

      // Format results to match our provider structure
      return results.map(place => this.formatPlaceAsProvider(place, location));
    } catch (error) {
      logger.error('GooglePlacesService: Search failed', {
        error: error.message,
        stack: error.stack
      });
      return [];
    }
  }

  /**
   * Get detailed information about a place
   * @param {string} placeId - Google Place ID
   * @returns {Promise<Object|null>} Place details or null
   */
  async getPlaceDetails(placeId) {
    if (!this.apiKey) {
      logger.warn('Google Places API key not configured, skipping details fetch');
      return null;
    }

    logger.info('GooglePlacesService: Fetching place details', { placeId });

    try {
      await this.rateLimit();

      const response = await axios.get(`${this.baseUrl}/details/json`, {
        params: {
          place_id: placeId,
          fields: 'name,formatted_address,formatted_phone_number,rating,user_ratings_total,website,opening_hours,geometry',
          key: this.apiKey
        },
        timeout: 10000
      });

      if (response.data.status !== 'OK') {
        logger.error('Google Places Details API error', {
          status: response.data.status,
          errorMessage: response.data.error_message
        });
        return null;
      }

      return response.data.result;
    } catch (error) {
      logger.error('GooglePlacesService: Failed to fetch place details', {
        placeId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Format Google Place result as provider object
   * @param {Object} place - Google Place result
   * @param {Object} userLocation - User's location {lat, lng}
   * @returns {Object} Formatted provider object
   */
  formatPlaceAsProvider(place, userLocation) {
    const distance = this.calculateDistance(
      userLocation.lat,
      userLocation.lng,
      place.geometry.location.lat,
      place.geometry.location.lng
    );

    return {
      name: place.name,
      specialty: 'General Practitioner', // Google doesn't provide specialty, default value
      address: place.formatted_address || place.vicinity || '',
      phone: place.formatted_phone_number || '',
      rating: place.rating || 0,
      reviewCount: place.user_ratings_total || 0,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      distance: distance.toFixed(1),
      distanceMiles: distance,
      website: place.website || null,
      profileUrl: place.website || null,
      bookingUrl: null,
      source: 'google_places',
      placeId: place.place_id
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - Latitude of point 1
   * @param {number} lon1 - Longitude of point 1
   * @param {number} lat2 - Latitude of point 2
   * @param {number} lon2 - Longitude of point 2
   * @returns {number} Distance in miles
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees to convert
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Rate limiting to avoid hitting API limits
   * @returns {Promise<void>}
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest;
      await this.sleep(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = GooglePlacesService;
