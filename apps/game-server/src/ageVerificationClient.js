/**
 * Age Verification Client for Game Server
 * Handles communication with the age verification API
 */

const axios = require('axios');

class AgeVerificationClient {
  constructor(apiBaseUrl = 'http://localhost:3000/api') {
    this.apiBaseUrl = apiBaseUrl;
    this.client = axios.create({
      baseURL: apiBaseUrl,
      timeout: 5000, // 5 second timeout
    });
  }

  /**
   * Check user's age verification status
   * @param {string} userId - User ID to check
   * @returns {Promise<Object>} Verification status
   */
  async getVerificationStatus(userId) {
    try {
      const response = await this.client.get(`/age/status`, {
        headers: { 'X-User-ID': userId } // Pass user ID in header for anonymous checks
      });

      return response.data.data;
    } catch (error) {
      console.error('Age verification status check error:', error.message);
      // Fail safe - assume unverified
      return { verified: false, age: null };
    }
  }

  /**
   * Check if user can access content
   * @param {string} userId - User ID
   * @param {string} contentRating - Content rating ('U', 'PG', etc.)
   * @returns {Promise<Object>} Access result
   */
  async checkContentAccess(userId, contentRating = 'PG') {
    try {
      const response = await this.client.post('/age/check-access', {
        contentRating
      }, {
        headers: { 'Authorization': `Bearer ${this.getAuthToken(userId)}` } // Assume auth token available
      });

      return response.data.data;
    } catch (error) {
      console.error('Content access check error:', error.message);
      // Fail safe - deny access
      return { canAccess: false, userAge: null, contentRating };
    }
  }

  /**
   * Get user's age restrictions
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Age restrictions
   */
  async getAgeRestrictions(userId) {
    try {
      const response = await this.client.get('/age/restrictions', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken(userId)}` }
      });

      return response.data.data;
    } catch (error) {
      console.error('Age restrictions check error:', error.message);
      return { verified: false, restrictions: { contentRating: 'U' } };
    }
  }

  /**
   * Get auth token for user
   * @param {string} userId
   * @returns {Promise<string>} Auth token
   */
  async getAuthToken(userId) {
    try {
      // Check if we have a cached token for this user
      if (this.tokenCache?.has(userId)) {
        const cached = this.tokenCache.get(userId);
        if (cached.expires > Date.now()) {
          return cached.token;
        }
        // Token expired, remove from cache
        this.tokenCache.delete(userId);
      }

      // For game server, we need to authenticate with the API
      // This assumes the game server has service credentials or user tokens are provided
      // In a real implementation, this might involve:
      // 1. Service account authentication
      // 2. User token validation/refresh
      // 3. Session management

      // For now, implement basic service authentication
      const serviceToken = await this.authenticateService();
      return serviceToken;

    } catch (error) {
      console.error('Token retrieval failed:', error.message);
      // Return a fallback token or throw error
      throw new Error('Unable to retrieve authentication token');
    }
  }

  /**
   * Authenticate service with API (placeholder for service account auth)
   * @returns {Promise<string>} Service token
   */
  async authenticateService() {
    try {
      // Service account authentication
      // In production, this would use proper service credentials
      const response = await this.client.post('/auth/service-login', {
        serviceId: process.env.GAME_SERVER_SERVICE_ID || 'game-server',
        secret: process.env.GAME_SERVER_SECRET
      });

      const token = response.data.data.token;

      // Cache the token
      if (!this.tokenCache) {
        this.tokenCache = new Map();
      }
      this.tokenCache.set('service', {
        token,
        expires: Date.now() + (15 * 60 * 1000) // 15 minutes
      });

      return token;
    } catch (error) {
      console.error('Service authentication failed:', error.message);
      // Fallback to environment token if available
      return process.env.GAME_SERVER_API_TOKEN || 'fallback-service-token';
    }
  }
}

module.exports = new AgeVerificationClient();
