/**
 * Compliance Client for Game Server
 * Handles communication with the compliance API for audit logging
 */

const axios = require('axios');

class ComplianceClient {
  constructor(apiBaseUrl = 'http://localhost:3000/api') {
    this.apiBaseUrl = apiBaseUrl;
    this.client = axios.create({
      baseURL: apiBaseUrl,
      timeout: 3000, // 3 second timeout for logging
    });
  }

  /**
   * Log a compliance event
   * @param {Object} event - Compliance event details
   * @returns {Promise<string>} Event ID
   */
  async logEvent(event) {
    try {
      // Fire and forget - don't wait for response to avoid blocking game actions
      this.client.post('/compliance/log', event).catch(err => {
        console.warn('Compliance logging failed:', err.message);
      });

      // Return a local event ID for immediate response
      return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } catch (error) {
      console.warn('Compliance logging error:', error.message);
      return null;
    }
  }

  /**
   * Log game creation event
   * @param {string} gameId - Game ID
   * @param {string} creatorId - Creator user ID
   * @param {string} gameName - Game name
   */
  async logGameCreated(gameId, creatorId, gameName) {
    return this.logEvent({
      category: 'game_action',
      action: 'game_created',
      userId: creatorId,
      resource: `game:${gameId}`,
      details: { gameName, gameId },
      complianceFrameworks: ['DSA', 'Online Safety Act']
    });
  }

  /**
   * Log player joining game
   * @param {string} gameId - Game ID
   * @param {string} playerId - Player user ID
   * @param {string} displayName - Player display name
   */
  async logPlayerJoined(gameId, playerId, displayName) {
    return this.logEvent({
      category: 'game_action',
      action: 'player_joined',
      userId: playerId,
      resource: `game:${gameId}`,
      details: { displayName, gameId },
      complianceFrameworks: ['DSA']
    });
  }

  /**
   * Log proposal creation
   * @param {string} gameId - Game ID
   * @param {string} proposalId - Proposal ID
   * @param {string} proposerId - Proposer user ID
   * @param {string} title - Proposal title
   * @param {boolean} moderated - Whether content was moderated
   * @param {boolean} flagged - Whether content was flagged
   */
  async logProposalCreated(gameId, proposalId, proposerId, title, moderated = false, flagged = false) {
    return this.logEvent({
      category: 'content_moderation',
      action: 'proposal_created',
      userId: proposerId,
      resource: `proposal:${proposalId}`,
      details: { gameId, title, moderated, flagged },
      complianceFrameworks: ['DSA', 'Online Safety Act']
    });
  }

  /**
   * Log vote cast
   * @param {string} gameId - Game ID
   * @param {string} proposalId - Proposal ID
   * @param {string} voterId - Voter user ID
   * @param {string} choice - Vote choice
   */
  async logVoteCast(gameId, proposalId, voterId, choice) {
    return this.logEvent({
      category: 'game_action',
      action: 'vote_cast',
      userId: voterId,
      resource: `proposal:${proposalId}`,
      details: { gameId, choice },
      complianceFrameworks: ['DSA']
    });
  }

  /**
   * Log content moderation action
   * @param {string} contentId - Content ID
   * @param {string} moderatorId - Moderator user ID
   * @param {string} action - Moderation action
   * @param {string[]} reasons - Flagging reasons
   */
  async logModerationAction(contentId, moderatorId, action, reasons = []) {
    return this.logEvent({
      category: 'content_moderation',
      action: 'moderation_action',
      userId: moderatorId,
      resource: `content:${contentId}`,
      details: { moderationAction: action, reasons },
      complianceFrameworks: ['DSA', 'Online Safety Act']
    });
  }
}

module.exports = new ComplianceClient();
