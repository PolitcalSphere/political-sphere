/**
 * Age Verification Client for Game Server
 * Handles communication with the age verification API
 */

import type { AxiosInstance } from "axios";
import axios from "axios";
import { CircuitBreaker } from "../api/src/utils/error-handler";

interface VerificationStatus {
  verified: boolean;
  age: number | null;
}

interface ContentAccessResult {
  canAccess: boolean;
  userAge: number | null;
  contentRating: string;
}

interface AgeRestrictions {
  verified: boolean;
  restrictions: {
    contentRating: string;
  };
}

interface TokenCache {
  token: string;
  expires: number;
}

class AgeVerificationClient {
  private readonly client: AxiosInstance;
  private readonly circuitBreaker: CircuitBreaker;
  private tokenCache?: Map<string, TokenCache>;

  constructor(apiBaseUrl: string = "http://localhost:3000/api") {
    this.client = axios.create({
      baseURL: apiBaseUrl,
      timeout: 5000, // 5 second timeout
    });

    // Circuit breaker for age verification API calls
    this.circuitBreaker = new CircuitBreaker(3, 30000, 30000); // 3 failures, 30s timeout
  }

  /**
   * Check user's age verification status
   * @param userId - User ID to check
   * @returns Verification status
   */
  async getVerificationStatus(userId: string): Promise<VerificationStatus> {
    try {
      const result = await this.circuitBreaker.execute(async () => {
        const response = await this.client.get("/age/status", {
          headers: { "X-User-ID": userId }, // Pass user ID in header for anonymous checks
        });
        return response.data.data as VerificationStatus;
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Age verification status check failed:", errorMessage);
      // Fail safe - assume unverified
      return { verified: false, age: null };
    }
  }

  /**
   * Check if user can access content
   * @param userId - User ID
   * @param contentRating - Content rating ('U', 'PG', etc.)
   * @returns Access result
   */
  async checkContentAccess(
    userId: string,
    contentRating: string = "PG"
  ): Promise<ContentAccessResult> {
    try {
      const result = await this.circuitBreaker.execute(async () => {
        const token = await this.getAuthToken(userId);
        const response = await this.client.post(
          "/age/check-access",
          {
            contentRating,
          },
          {
            headers: { Authorization: `Bearer ${token}` }, // Assume auth token available
          }
        );
        return response.data.data as ContentAccessResult;
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Content access check failed:", errorMessage);
      // Fail safe - deny access
      return { canAccess: false, userAge: null, contentRating };
    }
  }

  /**
   * Get user's age restrictions
   * @param userId - User ID
   * @returns Age restrictions
   */
  async getAgeRestrictions(userId: string): Promise<AgeRestrictions> {
    try {
      const token = await this.getAuthToken(userId);
      const response = await this.client.get("/age/restrictions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data.data as AgeRestrictions;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Age restrictions check error:", errorMessage);
      return { verified: false, restrictions: { contentRating: "U" } };
    }
  }

  /**
   * Get auth token for user
   * @param userId - User ID
   * @returns Auth token
   */
  async getAuthToken(userId: string): Promise<string> {
    try {
      // Check if we have a cached token for this user
      if (this.tokenCache?.has(userId)) {
        const cached = this.tokenCache.get(userId);
        if (cached && cached.expires > Date.now()) {
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
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Token retrieval failed:", errorMessage);
      // Return a fallback token or throw error
      throw new Error("Unable to retrieve authentication token");
    }
  }

  /**
   * Authenticate service with API (placeholder for service account auth)
   * @returns Service token
   */
  async authenticateService(): Promise<string> {
    try {
      // Service account authentication
      // In production, this would use proper service credentials
      const response = await this.client.post("/auth/service-login", {
        serviceId: process.env.GAME_SERVER_SERVICE_ID || "game-server",
        secret: process.env.GAME_SERVER_SECRET,
      });

      const token = response.data.data.token as string;

      // Cache the token
      if (!this.tokenCache) {
        this.tokenCache = new Map();
      }
      this.tokenCache.set("service", {
        token,
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      });

      return token;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Service authentication failed:", errorMessage);
      // Fallback to environment token if available
      return process.env.GAME_SERVER_API_TOKEN || "fallback-service-token";
    }
  }
}

export default new AgeVerificationClient();
