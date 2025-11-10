// Vitest-compatible CJS test shim.
// Avoid requiring node:test so Vitest can collect this file without invoking the Node test runner.
if (typeof global.test === "function") {
  global.test("example unit test - arithmetic", () => {
    global.expect(1 + 1).toBe(2);
  });
} else {
  // Not running under Vitest; skip.
}
