import { execFile } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ErrorCode,
	ListResourcesRequestSchema,
	ListToolsRequestSchema,
	McpError,
	ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const execFileAsync = promisify(execFile);
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(MODULE_DIR, "../../../..");
const API_BASE = "https://api.github.com";
const USER_AGENT = "political-sphere-mcp/1.0";

async function detectRepository() {
	if (process.env.GITHUB_REPOSITORY) {
		const value = process.env.GITHUB_REPOSITORY.trim();
		if (!/^[\w.-]+\/[\w.-]+$/.test(value)) {
			throw new McpError(
				ErrorCode.InvalidRequest,
				`GITHUB_REPOSITORY must be owner/repo, received ${value}`,
			);
		}
		return value;
	}

	try {
		const { stdout } = await execFileAsync("git", ["config", "--get", "remote.origin.url"], {
			cwd: REPO_ROOT,
		});
		const remote = stdout.trim();
		const match = remote.match(/[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
		if (match?.[1]) {
			return match[1];
		}
	} catch {
		// ignore
	}

	throw new McpError(
		ErrorCode.InvalidRequest,
		"Unable to determine repository. Set GITHUB_REPOSITORY=owner/repo.",
	);
}

async function githubFetch(path, searchParams = {}) {
	const url = new URL(path, API_BASE);
	for (const [key, value] of Object.entries(searchParams)) {
		if (value !== undefined && value !== null && value !== "") {
			url.searchParams.set(key, String(value));
		}
	}

	const headers = {
		Accept: "application/vnd.github+json",
		"User-Agent": USER_AGENT,
	};
	const token = process.env.GITHUB_TOKEN?.trim();
	if (token) {
		Object.assign(headers, { Authorization: `Bearer ${token}` });
	}

	const response = await fetch(url, { headers });
	if (response.status === 401) {
		throw new McpError(ErrorCode.InvalidRequest, "GitHub authentication failed");
	}
	if (!response.ok) {
		const payload = await response.text();
		throw new McpError(
			ErrorCode.InternalError,
			`GitHub API error (${response.status}): ${payload.slice(0, 2000)}`,
		);
	}

	return response.json();
}

class GitHubServer extends Server {
	constructor() {
		super(
			{
				name: "political-sphere-github",
				version: "1.0.0",
				description: "Interact with GitHub repository metadata",
			},
			{
				capabilities: {
					tools: {},
					resources: {},
				},
			},
		);

		this.setRequestHandler(ListToolsRequestSchema, this.listTools.bind(this));
		this.setRequestHandler(CallToolRequestSchema, this.callTool.bind(this));
		this.setRequestHandler(ListResourcesRequestSchema, this.listResources.bind(this));
		this.setRequestHandler(ReadResourceRequestSchema, this.readResource.bind(this));
	}

	async listTools() {
		return {
			tools: [
				{
					name: "github_repo_overview",
					description: "Fetch metadata for the configured repository",
					inputSchema: {
						type: "object",
						properties: {
							repository: {
								type: "string",
								description: "owner/repo. Defaults to GITHUB_REPOSITORY/env detection.",
							},
						},
					},
				},
				{
					name: "github_list_pull_requests",
					description: "List pull requests for the repository",
					inputSchema: {
						type: "object",
						properties: {
							repository: { type: "string" },
							state: {
								type: "string",
								enum: ["open", "closed", "all"],
								description: "Defaults to open",
							},
							limit: { type: "number", description: "Max PRs to return (default 20)" },
						},
					},
				},
				{
					name: "github_search_issues",
					description: "Search issues and pull requests in the repository",
					inputSchema: {
						type: "object",
						properties: {
							repository: { type: "string" },
							query: { type: "string", description: "Search query" },
							limit: { type: "number", description: "Max results (default 20)" },
						},
						required: ["query"],
					},
				},
			],
		};
	}

	async callTool(request) {
		const params = request.params ?? {};
		const name = params.name;
		const args = (params.arguments ?? {}) ?? {};

		switch (name) {
			case "github_repo_overview": {
				const repository =
					typeof args.repository === "string" ? args.repository : await detectRepository();
				const payload = await githubFetch(`/repos/${repository}`);
				const condensed = {
					repository,
					description: payload.description,
					default_branch: payload.default_branch,
					open_issues: payload.open_issues,
					stargazers: payload.stargazers_count,
					pushed_at: payload.pushed_at,
					visibility: payload.visibility,
				};
				return {
					content: [{ type: "text", text: JSON.stringify(condensed, null, 2) }],
				};
			}

			case "github_list_pull_requests": {
				const repository =
					typeof args.repository === "string" ? args.repository : await detectRepository();
				const state =
					typeof args.state === "string" && ["open", "closed", "all"].includes(args.state)
						? args.state
						: "open";
				const limit =
					typeof args.limit === "number" && Number.isFinite(args.limit)
						? Math.min(Math.max(1, Math.floor(args.limit)), 50)
						: 20;

				const data = await githubFetch(`/repos/${repository}/pulls`, {
					state,
					per_page: limit,
				});

				const pulls = data.map((pr) => ({
					number: pr.number,
					title: pr.title,
					user: pr.user?.login,
					state: pr.state,
					created_at: pr.created_at,
					updated_at: pr.updated_at,
					url: pr.html_url,
				}));

				return { content: [{ type: "text", text: JSON.stringify({ pulls }, null, 2) }] };
			}

			case "github_search_issues": {
				if (typeof args.query !== "string" || args.query.trim().length === 0) {
					throw new McpError(ErrorCode.InvalidRequest, "query is required");
				}
				const repository =
					typeof args.repository === "string" ? args.repository : await detectRepository();
				const limit =
					typeof args.limit === "number" && Number.isFinite(args.limit)
						? Math.min(Math.max(1, Math.floor(args.limit)), 50)
						: 20;

				const q = `${args.query} repo:${repository}`;
				const data = await githubFetch(`/search/issues`, {
					q,
					per_page: limit,
				});

				const results = data.items.map((item) => ({
					number: item.number,
					title: item.title,
					state: item.state,
					is_pr: Boolean(item.pull_request),
					url: item.html_url,
				}));

				return { content: [{ type: "text", text: JSON.stringify({ results }, null, 2) }] };
			}

			default:
				throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
		}
	}

	async listResources() {
		const repository = process.env.GITHUB_REPOSITORY ?? "(unset)";
		return {
			resources: [
				{
					uri: "github://political-sphere/config",
					name: "GitHub configuration",
					description: "Environment variables used for GitHub integration",
					mimeType: "application/json",
				},
				{
					uri: "github://political-sphere/repository",
					name: "Detected repository",
					description: `Current repository: ${repository}`,
					mimeType: "text/plain",
				},
			],
		};
	}

	async readResource(request) {
		const uri = request.params?.uri;
		if (uri === "github://political-sphere/config") {
			return {
				contents: [
					{
						uri,
						mimeType: "application/json",
						text: JSON.stringify(
							{
								GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY ?? null,
								GITHUB_TOKEN: process.env.GITHUB_TOKEN ? "set" : "unset",
							},
							null,
							2,
						),
					},
				],
			};
		}
		if (uri === "github://political-sphere/repository") {
			const repository = process.env.GITHUB_REPOSITORY
				? process.env.GITHUB_REPOSITORY
				: await detectRepository();
			return {
				contents: [{ uri, mimeType: "text/plain", text: repository }],
			};
		}
		throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
	}
}

async function main() {
	const server = new GitHubServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("GitHub MCP server ready on STDIO");
}

main().catch((error) => {
	console.error("GitHub MCP server failed:", error);
	process.exitCode = 1;
});
