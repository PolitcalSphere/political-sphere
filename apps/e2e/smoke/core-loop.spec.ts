/**
 * Core Loop E2E Smoke Test
 * Registers two users, creates game, joins second user, proposes and votes.
 * STATUS: PARTIAL
 *   - API portions: OPERATIONAL (localhost:3001)
 *   - Frontend portion: PENDING_IMPLEMENTATION (dev server wiring incomplete)
 */
import { test, expect } from "@playwright/test";

const API_BASE = process.env.API_BASE_URL || "http://localhost:3001";
const WEB_BASE = process.env.WEB_BASE_URL || "http://localhost:5173";

async function apiJson(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data } as const;
}

async function register(username: string, password: string) {
  const { res, data } = await apiJson("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.status).toBeLessThan(300);
  expect(data.tokens?.accessToken).toBeTruthy();
  return data.tokens.accessToken as string;
}

async function createGame(token: string, name: string) {
  const { res, data } = await apiJson("/game/create", {
    method: "POST",
    body: JSON.stringify({ name }),
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status).toBe(201);
  expect(data.game?.id).toBeTruthy();
  return data.game.id as string;
}

async function joinGame(token: string, gameId: string) {
  const { res, data } = await apiJson(`/game/${gameId}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status).toBe(200);
  expect(data.game?.players?.length).toBeGreaterThan(1);
  return data.game;
}

async function propose(token: string, gameId: string) {
  const { res, data } = await apiJson(`/game/${gameId}/action`, {
    method: "POST",
    body: JSON.stringify({
      type: "propose",
      payload: { title: "Test Bill", description: "Demo proposal" },
    }),
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status).toBe(200);
  expect(Array.isArray(data.game?.proposals)).toBe(true);
  expect(data.game.proposals.length).toBeGreaterThan(0);
  return data.game.proposals[data.game.proposals.length - 1].id as string;
}

async function vote(token: string, gameId: string, proposalId: string) {
  const { res, data } = await apiJson(`/game/${gameId}/action`, {
    method: "POST",
    body: JSON.stringify({
      type: "vote",
      payload: { proposalId, choice: "for" },
    }),
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status).toBe(200);
  expect(Array.isArray(data.game?.votes)).toBe(true);
  type Vote = { proposalId: string; choice: string; playerId?: string };
  expect(
    (data.game.votes as Vote[]).some((v) => v.proposalId === proposalId)
  ).toBe(true);
}

test.describe("Core Loop Smoke", () => {
  test("register, create game, join, propose, vote (API direct)", async () => {
    const userA = `uA-${Date.now()}`;
    const userB = `uB-${Date.now()}`;
    const pass = "pass12345";

    const tokenA = await register(userA, pass);
    const tokenB = await register(userB, pass);

    const gameId = await createGame(tokenA, "Core Loop Test");
    await joinGame(tokenB, gameId);

    const proposalId = await propose(tokenA, gameId);
    await vote(tokenB, gameId, proposalId);
  });

  // STATUS: PENDING_IMPLEMENTATION
  // REASON: apps/web dev server configuration not yet aligned (ports, Vite root, scripts)
  // DEPENDENCIES: Correct Vite config (root=apps/web, port selection), npm scripts, stable selectors
  // ESTIMATED_READINESS: After frontend devserver wiring PR
  test.skip("frontend login + lobby list renders (manual lightweight check)", async ({
    page,
  }) => {
    await page.goto(`${WEB_BASE}/`);
  });
});
