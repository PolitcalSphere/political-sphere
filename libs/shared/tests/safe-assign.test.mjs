import { describe, expect, it } from "vitest";
import { pick, safeAssign } from "../src/safe-assign.mjs";

describe("safe-assign utilities", () => {
	it("pick copies only allowed keys", () => {
		const src = { a: 1, b: 2, c: 3 };
		const picked = pick(src, ["a", "c"]);
		expect(picked).toEqual({ a: 1, c: 3 });
	});

	it("safeAssign merges only allowed keys into target", () => {
		const target = { x: 0 };
		const src = { a: 1, b: 2 };
		const result = safeAssign(target, src, ["b"]);
		// result should be the target object and only include allowed key 'b'
		expect(result).toBe(target);
		expect(result).toEqual({ x: 0, b: 2 });
	});
});
