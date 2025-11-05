// Minimal runtime error-handler and circuit breaker shim for tests
class DatabaseError extends Error {
	constructor(message) {
		super(message);
		this.name = "DatabaseError";
	}
}

async function retryWithBackoff(fn, attempts = 3, delayMs = 50) {
	let lastErr;
	for (let i = 0; i < attempts; i++) {
		try {
			return await fn();
		} catch (err) {
			lastErr = err;
			await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
		}
	}
	throw lastErr;
}

class CircuitBreaker {
	constructor(failureThreshold = 5, timeoutMs = 60000, resetTimeoutMs = 60000) {
		this.failureThreshold = failureThreshold;
		this.timeoutMs = timeoutMs;
		this.resetTimeoutMs = resetTimeoutMs;
		this.failures = 0;
		this.lastFailureAt = 0;
		this.openUntil = 0;
	}

	async execute(fn) {
		const now = Date.now();
		if (this.openUntil && now < this.openUntil) {
			throw new Error("Circuit breaker open");
		}

		try {
			const result = await fn();
			this.failures = 0;
			return result;
		} catch (err) {
			this.failures += 1;
			this.lastFailureAt = Date.now();
			if (this.failures >= this.failureThreshold) {
				this.openUntil = Date.now() + this.resetTimeoutMs;
			}
			throw err;
		}
	}
}

export { DatabaseError, retryWithBackoff, CircuitBreaker };
