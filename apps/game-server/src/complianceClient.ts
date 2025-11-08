/**
 * Compliance Client for Game Server
 * Handles communication with the compliance API for audit logging
 */

import type { AxiosInstance } from "axios";
import axios from "axios";
import { CircuitBreaker } from "../api/src/utils/error-handler";

interface ComplianceEvent {
  category: string;
  action: string;
  userId: string;
  resource: string;
  details: Record<string, unknown>;
  complianceFrameworks: string[];
}

class ComplianceClient {
  private readonly client: AxiosInstance;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(apiBaseUrl: string = "http://localhost:3000/api") {
    this.client = axios.create({
      baseURL: apiBaseUrl,
      timeout: 3000, // 3 second timeout for logging
    });

    // Circuit breaker for compliance logging (more lenient since it's non-critical)
    this.circuitBreaker = new CircuitBreaker(10, 120000, 30000); // 10 failures, 2min timeout, 30s recovery
  }

  /**
   * Log a compliance event
   * @param event - Compliance event details
   * @returns Event ID
   */
  async logEvent(event: ComplianceEvent): Promise<string | null> {
    try {
      // Fire and forget with circuit breaker protection
      this.circuitBreaker
        .execute(async () => {
          await this.client.post("/compliance/log", event);
        })
        .catch((err: Error) => {
          console.warn(
            "Compliance logging failed (circuit breaker):",
            err.message
          );
        });

      // Return a local event ID for immediate response
      return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.warn("Compliance logging error:", errorMessage);
      return null;
    }
  }

  /**
   * Log game creation event
   * @param gameId - Game ID
   * @param creatorId - Creator user ID
   * @param gameName - Game name
   */
  async logGameCreated(
    gameId: string,
    creatorId: string,
    gameName: string
  ): Promise<string | null> {
    return this.logEvent({
      category: "game_action",
      action: "game_created",
      userId: creatorId,
      resource: `game:${gameId}`,
      details: { gameName, gameId },
      complianceFrameworks: ["DSA", "Online Safety Act"],
    });
  }

  /**
   * Log player joining game
   * @param gameId - Game ID
   * @param playerId - Player user ID
   * @param displayName - Player display name
   */
  async logPlayerJoined(
    gameId: string,
    playerId: string,
    displayName: string
  ): Promise<string | null> {
    return this.logEvent({
      category: "game_action",
      action: "player_joined",
      userId: playerId,
      resource: `game:${gameId}`,
      details: { displayName, gameId },
      complianceFrameworks: ["DSA"],
    });
  }

  /**
   * Log proposal creation
   * @param gameId - Game ID
   * @param proposalId - Proposal ID
   * @param proposerId - Proposer user ID
   * @param title - Proposal title
   * @param moderated - Whether content was moderated
   * @param flagged - Whether content was flagged
   */
  async logProposalCreated(
    gameId: string,
    proposalId: string,
    proposerId: string,
    title: string,
    moderated: boolean = false,
    flagged: boolean = false
  ): Promise<string | null> {
    return this.logEvent({
      category: "content_moderation",
      action: "proposal_created",
      userId: proposerId,
      resource: `proposal:${proposalId}`,
      details: { gameId, title, moderated, flagged },
      complianceFrameworks: ["DSA", "Online Safety Act"],
    });
  }

  /**
   * Log vote cast
   * @param gameId - Game ID
   * @param proposalId - Proposal ID
   * @param voterId - Voter user ID
   * @param choice - Vote choice
   */
  async logVoteCast(
    gameId: string,
    proposalId: string,
    voterId: string,
    choice: string
  ): Promise<string | null> {
    return this.logEvent({
      category: "game_action",
      action: "vote_cast",
      userId: voterId,
      resource: `proposal:${proposalId}`,
      details: { gameId, choice },
      complianceFrameworks: ["DSA"],
    });
  }

  /**
   * Log content moderation action
   * @param contentId - Content ID
   * @param moderatorId - Moderator user ID
   * @param action - Moderation action
   * @param reasons - Flagging reasons
   */
  async logModerationAction(
    contentId: string,
    moderatorId: string,
    action: string,
    reasons: string[] = []
  ): Promise<string | null> {
    return this.logEvent({
      category: "content_moderation",
      action: "moderation_action",
      userId: moderatorId,
      resource: `content:${contentId}`,
      details: { moderationAction: action, reasons },
      complianceFrameworks: ["DSA", "Online Safety Act"],
    });
  }
}

export default new ComplianceClient();
