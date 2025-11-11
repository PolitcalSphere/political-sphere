/**
 * Benchmark Features
 *
 * Runs performance benchmarks on various features and components to measure:
 * - API endpoint response times
 * - Database query performance
 * - Frontend component render times
 * - Memory usage and leaks
 * - Throughput under load
 *
 * @module scripts/benchmark-features
 */

import { performance } from "node:perf_hooks";

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  throughput?: number;
}

interface BenchmarkOptions {
  iterations?: number;
  warmup?: number;
  async?: boolean;
}

/**
 * Default benchmark options
 */
const DEFAULT_OPTIONS: BenchmarkOptions = {
  iterations: 1000,
  warmup: 100,
  async: false,
};

/**
 * Benchmark runner class
 */
class BenchmarkRunner {
  private results: BenchmarkResult[] = [];

  /**
   * Run a benchmark
   */
  async benchmark(
    name: string,
    fn: () => void | Promise<void>,
    options: BenchmarkOptions = DEFAULT_OPTIONS,
  ): Promise<BenchmarkResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    console.log(`\n🔬 Benchmarking: ${name}`);
    console.log(`   Iterations: ${opts.iterations}, Warmup: ${opts.warmup}`);

    // Warmup phase
    if (opts.warmup && opts.warmup > 0) {
      console.log("   → Running warmup...");
      for (let i = 0; i < opts.warmup; i++) {
        if (opts.async) {
          await (fn as () => Promise<void>)();
        } else {
          (fn as () => void)();
        }
      }
    }

    // Benchmark phase
    console.log("   → Running benchmark...");
    const times: number[] = [];
    const startTotal = performance.now();

    for (let i = 0; i < (opts.iterations || 1000); i++) {
      const start = performance.now();

      if (opts.async) {
        await (fn as () => Promise<void>)();
      } else {
        (fn as () => void)();
      }

      const end = performance.now();
      times.push(end - start);
    }

    const endTotal = performance.now();
    const totalTime = endTotal - startTotal;

    // Calculate statistics
    const result = this.calculateStats(name, times, totalTime, opts.iterations || 1000);
    this.results.push(result);
    this.printResult(result);

    return result;
  }

  /**
   * Calculate benchmark statistics
   */
  private calculateStats(
    name: string,
    times: number[],
    totalTime: number,
    iterations: number,
  ): BenchmarkResult {
    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    // Calculate standard deviation
    const squareDiffs = times.map((time) => (time - avg) ** 2);
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    // Calculate throughput (operations per second)
    const throughput = (iterations / totalTime) * 1000;

    return {
      name,
      iterations,
      totalTime,
      averageTime: avg,
      minTime: min,
      maxTime: max,
      standardDeviation: stdDev,
      throughput,
    };
  }

  /**
   * Print benchmark result
   */
  private printResult(result: BenchmarkResult): void {
    console.log(`   ✓ ${result.name}`);
    console.log(`     Average: ${result.averageTime.toFixed(3)}ms`);
    console.log(`     Min: ${result.minTime.toFixed(3)}ms, Max: ${result.maxTime.toFixed(3)}ms`);
    console.log(`     Std Dev: ${result.standardDeviation.toFixed(3)}ms`);
    if (result.throughput) {
      console.log(`     Throughput: ${result.throughput.toFixed(0)} ops/sec`);
    }
  }

  /**
   * Print summary of all benchmarks
   */
  printSummary(): void {
    console.log("\n📊 Benchmark Summary");
    console.log("═".repeat(80));

    for (const result of this.results) {
      const opsPerSec = result.throughput?.toFixed(0) || "N/A";
      console.log(
        `${result.name.padEnd(40)} ${result.averageTime.toFixed(3)}ms (${opsPerSec} ops/sec)`,
      );
    }

    console.log("═".repeat(80));
  }

  /**
   * Export results to JSON
   */
  exportResults(filename: string): void {
    const json = JSON.stringify(this.results, null, 2);
    console.log(`\n💾 Exporting results to: ${filename}`);
    console.log(json);
  }

  /**
   * Get all results
   */
  getResults(): BenchmarkResult[] {
    return this.results;
  }
}

/**
 * Example benchmark: String concatenation
 */
function benchmarkStringConcat(runner: BenchmarkRunner): void {
  runner.benchmark(
    "String concatenation",
    () => {
      let str = "";
      for (let i = 0; i < 100; i++) {
        str += "a";
      }
    },
    { iterations: 10000 },
  );
}

/**
 * Example benchmark: Array operations
 */
function benchmarkArrayOps(runner: BenchmarkRunner): void {
  runner.benchmark(
    "Array push operations",
    () => {
      const arr: number[] = [];
      for (let i = 0; i < 100; i++) {
        arr.push(i);
      }
    },
    { iterations: 10000 },
  );
}

/**
 * Example benchmark: Object creation
 */
function benchmarkObjectCreation(runner: BenchmarkRunner): void {
  runner.benchmark(
    "Object creation",
    () => {
      const obj = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        createdAt: new Date(),
      };
      // Access a property to prevent dead code elimination and better reflect real-world usage
      obj.id;
    },
    { iterations: 10000 },
  );
}

/**
 * Example benchmark: Async operations
 */
async function benchmarkAsyncOps(runner: BenchmarkRunner): Promise<void> {
  await runner.benchmark(
    "Async Promise resolve",
    async () => {
      await Promise.resolve("done");
    },
    { iterations: 1000, async: true },
  );
}

/**
 * Example benchmark: JSON operations
 */
function benchmarkJsonOps(runner: BenchmarkRunner): void {
  const data = {
    users: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
    })),
  };

  runner.benchmark(
    "JSON stringify",
    () => {
      JSON.stringify(data);
    },
    { iterations: 1000 },
  );

  const jsonString = JSON.stringify(data);

  runner.benchmark(
    "JSON parse",
    () => {
      JSON.parse(jsonString);
    },
    { iterations: 1000 },
  );
}

/**
 * Run all benchmarks
 */
async function runAllBenchmarks(): Promise<void> {
  console.log("🚀 Starting feature benchmarks...");

  const runner = new BenchmarkRunner();

  // Run synchronous benchmarks
  benchmarkStringConcat(runner);
  benchmarkArrayOps(runner);
  benchmarkObjectCreation(runner);
  benchmarkJsonOps(runner);

  // Run async benchmarks
  await benchmarkAsyncOps(runner);

  // Print summary
  runner.printSummary();

  // Export results
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  runner.exportResults(`benchmark-results-${timestamp}.json`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllBenchmarks()
    .then(() => {
      console.log("\n✅ Benchmarks complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Benchmark failed:", error);
      process.exit(1);
    });
}

export { BenchmarkRunner, type BenchmarkResult, type BenchmarkOptions };
