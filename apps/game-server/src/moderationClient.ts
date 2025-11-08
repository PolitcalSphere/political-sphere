/**
 * Moderation Client for Game Server
 * Handles communication with the moderation API
 */

import type { AxiosInstance } from "axios";
import axios from "axios";
import { CircuitBreaker } from "../api/src/utils/error-handler";

interface ModerationResult {
  isSafe: boolean;
  reasons: string[];
  category: string;
}

interface ModerationReport {
  contentId: string;
  reporterId: string;
  reason: string;
  details?: Record<string, unknown>;
}

class ModerationClient {
  private readonly client: AxiosInstance;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(apiBaseUrl: string = "http://localhost:3000/api") {
    this.client = axios.create({
      baseURL: apiBaseUrl,
      timeout: 10000, // 10 second timeout
    });

    // Circuit breaker for moderation API calls
    this.circuitBreaker = new CircuitBreaker(5, 60000, 60000); // 5 failures, 1min timeout
  }

  /**
   * Analyze content for moderation
   * @param content - Content to analyze
   * @param type - Content type ('text', 'image', etc.)
   * @param userId - User ID for logging
   * @returns Moderation result
   */
  async analyzeContent(
    content: string,
    type: string = "text",
    userId: string | null = null
  ): Promise<ModerationResult> {
    try {
      const result = await this.circuitBreaker.execute(async () => {
        const response = await this.client.post("/moderation/analyze", {
          content,
          type,
          userId,
        });
        return response.data.data as ModerationResult;
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Moderation API failed:", errorMessage);
      // Fail safe - assume unsafe on API failure
      return {
        isSafe: false,
        reasons: ["Moderation service unavailable"],
        category: "blocked",
      };
    }
  }

  /**
   * Submit a user report
   * @param report - Report details
   * @returns Report result
   */
  async submitReport(report: ModerationReport): Promise<unknown> {
    try {
      const response = await this.client.post("/moderation/report", report);
      return response.data.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Report submission error:", errorMessage);
      throw error;
    }
  }
}

export default new ModerationClient();
