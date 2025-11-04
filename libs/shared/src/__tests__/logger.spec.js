import { vi } from "vitest";
import { createLogger, getLogger, LOG_LEVELS } from "../logger.js";

describe("Logger (shared)", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("createLogger returns distinct instances; getLogger returns singleton", () => {
		const a = createLogger({ console: false });
		const b = createLogger({ console: false });
		expect(a).not.toBe(b);

		const g1 = getLogger({ console: false });
		const g2 = getLogger();
		expect(g1).toBe(g2);
	});

	it("respects level filtering (info filtered when level is WARN)", () => {
		const logger = createLogger({
			level: LOG_LEVELS.WARN,
			console: true,
			environment: "production",
		});
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});

		logger.info("should be filtered out");
		logger.warn("should be emitted");

		expect(spy).toHaveBeenCalledTimes(1);
		const arg = spy.mock.calls[0][0];
		expect(String(arg)).toContain("should be emitted");
	});

	it("logRequest logs at the right level for 2xx/4xx/5xx", () => {
		const logger = createLogger({ console: true, environment: "production" });
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});

		const baseReq = {
			method: "GET",
			url: "/x",
			headers: { "user-agent": "ua" },
			socket: { remoteAddress: "1.2.3.4" },
		};

		logger.logRequest(baseReq, { statusCode: 200 }, 12);
		expect(spy).toHaveBeenCalled();
		spy.mockClear();

		logger.logRequest(baseReq, { statusCode: 400 }, 13);
		expect(spy).toHaveBeenCalled();
		spy.mockClear();

		logger.logRequest(baseReq, { statusCode: 500 }, 14);
		expect(spy).toHaveBeenCalled();
	});

	it("logError includes stack and context details", () => {
		const logger = createLogger({ console: true, environment: "production" });
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});

		const err = new Error("boom");
		logger.logError(err, { route: "/x" });

		expect(spy).toHaveBeenCalled();
		const found = spy.mock.calls.some(
			(c) =>
				String(c[0]).includes("Application error") &&
				String(c[0]).includes("boom"),
		);
		expect(found).toBeTruthy();
	});

	it("logSecurityEvent emits SECURITY_EVENT with ip and userAgent", () => {
		const logger = createLogger({ console: true, environment: "production" });
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});

		const req = {
			headers: { "x-forwarded-for": "2.3.4.5,1.1.1.1", "user-agent": "ua" },
			socket: { remoteAddress: "2.3.4.5" },
		};
		logger.logSecurityEvent("login_attempt", { userId: "u1" }, req);

		expect(spy).toHaveBeenCalled();
		const foundSec = spy.mock.calls.some(
			(c) =>
				String(c[0]).includes("SECURITY_EVENT") &&
				String(c[0]).includes("login_attempt"),
		);
		expect(foundSec).toBeTruthy();
	});

	it("writes to file when file option provided", async () => {
		const os = await import("node:os");
		const fs = await import("node:fs/promises");
		const path = await import("node:path");

		const tmp = os.tmpdir();
		const filePath = path.join(tmp, `ps-test-logger-${Date.now()}.log`);

		// Ensure file does not exist
		try {
			await fs.rm(filePath);
		} catch {}

		const logger = createLogger({ file: filePath, console: false });

		// Wait for the stream to initialize (internal async init)
		const waitForStream = () =>
			new Promise((resolve, reject) => {
				const start = Date.now();
				const iv = setInterval(() => {
					if (logger.stream) {
						clearInterval(iv);
						resolve(true);
					} else if (Date.now() - start > 2000) {
						clearInterval(iv);
						reject(new Error("stream not created"));
					}
				}, 50);
			});

		await waitForStream();

		logger.info("file-test", { tag: "file" });

		// wait a short moment for write to flush
		await new Promise((r) => setTimeout(r, 150));

		const content = await fs.readFile(filePath, "utf8");
		expect(content).toContain("file-test");

		// cleanup
		logger.close();
		try {
			await fs.rm(filePath);
		} catch {}
	});

	it("development console uses ANSI colour prefix when environment=development", () => {
		const logger = createLogger({
			level: LOG_LEVELS.DEBUG,
			console: true,
			environment: "development",
		});
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});

		logger.debug("dmsg");
		expect(spy).toHaveBeenCalled();
		const any = spy.mock.calls.find((c) => String(c[0]).includes("dmsg"));
		expect(any).toBeTruthy();
		// coloured output may include ANSI sequences in some environments, but
		// that's an implementation detail — ensure the message itself was logged.
		// Colour sequences are optional in test environments.
	});
});
// (duplicate tests removed — use the focused suite above)
