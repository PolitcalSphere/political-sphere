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
   * Get auth token for user (placeholder - implement based on auth system)
   * @param {string} userId
   * @returns {string} Auth token
   */
  getAuthToken(userId) {
    // TODO: Implement proper token retrieval
    // This should integrate with your authentication system
    return `user_${userId}_token`;
  }
}

module.exports = new AgeVerificationClient();
