/**
 * Single World Political Simulation E2E Tests
 * Tests interaction with the single shared game world
 *
 * NOTE: Political Sphere has ONE world/game that all players participate in.
 * This is not a multi-game platform - everyone is in the same political simulation.
 */
import { test, expect } from "@playwright/test";

import { GameBoardPage } from "../pages/GameBoardPage";
import { LoginPage } from "../pages/LoginPage";

test.describe("Single World Gameplay", () => {
  let loginPage: LoginPage;
  let gamePage: GameBoardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    gamePage = new GameBoardPage(page);

    // Login before each test
    await loginPage.goto();
    await loginPage.login("test@example.com", "password123");
    await loginPage.waitForSuccess();
  });

  test("should enter the game world after login", async ({ page }) => {
    // After login, should be redirected to the game world
    await expect(page).toHaveURL(/\/game/);
    await expect(gamePage.proposalsList).toBeVisible();
  });

  test("should display existing proposals in the world", async () => {
    await gamePage.waitForProposalsLoad();
    const proposals = await gamePage.getProposalTitles();

    // World may or may not have proposals, but list should be accessible
    expect(Array.isArray(proposals)).toBe(true);
  });

  test("should handle multiple concurrent players", async ({ browser }) => {
    // Player 2 joins the same world in new context
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const login2 = new LoginPage(page2);
    const game2 = new GameBoardPage(page2);

    await login2.goto();
    await login2.login("user2@example.com", "password123");
    await login2.waitForSuccess();

    // Both players should be in the same game world
    await expect(page2).toHaveURL(/\/game/);
    await game2.waitForProposalsLoad();

    // Both see the same proposals (shared world state)
    const proposals1 = await gamePage.getProposalTitles();
    const proposals2 = await game2.getProposalTitles();

    expect(proposals1).toEqual(proposals2);

    await context2.close();
  });
});
