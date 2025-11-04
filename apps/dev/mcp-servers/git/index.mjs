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

async function runGit(args) {
	try {
		const { stdout } = await execFileAsync("git", args, { cwd: REPO_ROOT });
		return stdout.trim();
	} catch (error) {
		const stderr = error.stderr ? String(error.stderr) : error.message;
		throw new McpError(ErrorCode.InternalError, `git ${args.join(" ")} failed: ${stderr}`);
	}
}

class GitServer extends Server {
	constructor() {
		super(
			{
				name: "political-sphere-git",
				version: "1.0.0",
				description: "Local Git repository insights",
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
					name: "git_status",
					description: "Show working tree status summary",
					inputSchema: { type: "object", properties: {} },
				},
				{
					name: "git_log",
					description: "Show recent commits with metadata",
					inputSchema: {
						type: "object",
						properties: {
							limit: {
								type: "number",
								description: "Number of commits to return (default 10, max 50)",
							},
						},
					},
				},
				{
					name: "git_diff",
					description: "Show diff between revisions",
					inputSchema: {
						type: "object",
						properties: {
							revision: { type: "string", description: "Target revision (default HEAD)" },
							path: { type: "string", description: "Optional file path to focus on" },
						},
					},
				},
				{
					name: "git_show",
					description: "Show details for a specific commit",
					inputSchema: {
						type: "object",
						properties: {
							commit: { type: "string", description: "Commit SHA or reference" },
						},
						required: ["commit"],
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
			case "git_status": {
				const result = await runGit(["status", "--short", "--branch"]);
				return { content: [{ type: "text", text: result || "clean" }] };
			}

			case "git_log": {
				const limit =
					typeof args.limit === "number" && Number.isFinite(args.limit)
						? Math.min(Math.max(1, Math.floor(args.limit)), 50)
						: 10;
				const format = "%h%x09%an%x09%ad%x09%s";
				const result = await runGit([
					"log",
					`-n`,
					String(limit),
					`--date=relative`,
					`--pretty=format:${format}`,
				]);

				const commits = result
					.split("\n")
					.filter(Boolean)
					.map((line) => {
						const [sha, author, date, subject] = line.split("\t");
						return { sha, author, date, subject };
					});

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({ commits }, null, 2),
						},
					],
				};
			}

			case "git_diff": {
				const revision = typeof args.revision === "string" ? args.revision : "HEAD";
				const diffArgs = ["diff", `${revision}`];
				if (typeof args.path === "string" && args.path.length > 0) {
					diffArgs.push("--", args.path);
				}
				const result = await runGit(diffArgs);
				return { content: [{ type: "text", text: result || "No diff" }] };
			}

			case "git_show": {
				if (typeof args.commit !== "string" || args.commit.length === 0) {
					throw new McpError(ErrorCode.InvalidRequest, "commit is required");
				}
				const result = await runGit(["show", args.commit, "--stat", "--pretty=fuller"]);
				return { content: [{ type: "text", text: result }] };
			}

			default:
				throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
		}
	}

	async listResources() {
		const branches = await runGit(["branch", "--show-current"]);
		const remotes = await runGit(["remote", "-v"]);
		return {
			resources: [
				{
					uri: "git://political-sphere/status",
					name: "Working tree status",
					description: branches ? `Current branch: ${branches}` : "Detached HEAD",
					mimeType: "text/plain",
				},
				{
					uri: "git://political-sphere/remotes",
					name: "Configured remotes",
					description: "Remote origins for this repository",
					mimeType: "text/plain",
				},
			],
		};
	}

	async readResource(request) {
		const uri = request.params?.uri;
		if (uri === "git://political-sphere/status") {
			const status = await runGit(["status", "--short", "--branch"]);
			return {
				contents: [{ uri, mimeType: "text/plain", text: status || "clean" }],
			};
		}
		if (uri === "git://political-sphere/remotes") {
			const remotes = await runGit(["remote", "-v"]);
			return { contents: [{ uri, mimeType: "text/plain", text: remotes }] };
		}
		throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
	}
}

async function main() {
	const server = new GitServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Git MCP server ready on STDIO");
}

main().catch((error) => {
	console.error("Git MCP server failed:", error);
	process.exitCode = 1;
});
