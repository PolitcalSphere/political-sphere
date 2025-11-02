/**
 * Configuration module for worker
 */

const API_URL = process.env.API_URL ?? "http://api:4000";
const DEFAULT_INTERVAL_MS = 15000;
const INTERVAL = Number.parseInt(
  process.env.WORKER_INTERVAL_MS ?? DEFAULT_INTERVAL_MS.toString(),
  10,
);
const OUTPUT_PATH =
  process.env.WORKER_OUTPUT ?? new URL("../output/news-summary.json", import.meta.url).pathname;

export { API_URL, INTERVAL, OUTPUT_PATH };
