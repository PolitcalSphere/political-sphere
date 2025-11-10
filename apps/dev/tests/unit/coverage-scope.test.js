import { createLogger, getLogger } from "@political-sphere/shared";

describe("coverage scope smoke", () => {
  test("shared logger exports available", () => {
    expect(typeof getLogger).toBe("function");
    expect(typeof createLogger).toBe("function");
    const l = createLogger({ console: false });
    expect(l).toHaveProperty("info");
    expect(typeof l.info).toBe("function");
  });
});
