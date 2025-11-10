import { expect, test } from "vitest";

test("self-healing demo - should demonstrate auto-fixing", () => {
  expect(2 + 2).toBe(4);
});

test("self-healing demo - nested tests - nested test case", () => {
  expect(true).toBeTruthy();
});
