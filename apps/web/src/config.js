/**
 * Configuration module for frontend server
 */

const PORT = Number.parseInt(process.env.FRONTEND_PORT ?? "3000", 10);
const HOST = process.env.FRONTEND_HOST ?? "0.0.0.0";
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";
const ENABLE_SECURITY_HEADERS = process.env.ENABLE_SECURITY_HEADERS !== "false";

export { PORT, HOST, API_BASE_URL, ENABLE_SECURITY_HEADERS };
