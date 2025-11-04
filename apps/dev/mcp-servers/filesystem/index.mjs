import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(MODULE_DIR, "../../../..");
const MAX_SEARCH_RESULTS = 20;
const MAX_SEARCH_FILE_SIZE = 256 * 1024; // 256 KB

function resolveInsideRepo(targetPath) {
	const absolute = resolve(REPO_ROOT, targetPath);
	if (!absolute.startsWith(REPO_ROOT)) {
		throw new McpError(ErrorCode.InvalidRequest, "Path escapes repository root");
	}
	return absolute;
}

async function readFileSafe(targetPath, encoding = "utf8") {
	const absolute = resolveInsideRepo(targetPath);
	const info = await stat(absolute);
	if (!info.isFile()) {
		throw new McpError(ErrorCode.InvalidRequest, "Target is not a file");
	}
	if (info.size > 512 * 1024) {
		throw new McpError(ErrorCode.InvalidRequest, "File is larger than 512KB");
	}
	return readFile(absolute, encoding);
}

async function listDirectoryEntries(targetPath, options) {
	const absolute = resolveInsideRepo(targetPath);
	const entries = await readdir(absolute, { withFileTypes: true });
	const limit = Math.min(options?.limit ?? 200, 500);
	const payload = [];

	for (const entry of entries.slice(0, limit)) {
		const entryPath = resolve(absolute, entry.name);
		const stats = await stat(entryPath);
		payload.push({
			name: entry.name,
			type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other",
			size: stats.size,
			relativePath: relative(REPO_ROOT, entryPath),
			mtime: stats.mtime.toISOString(),
		});
	}

	return payload;
}

async function searchText(options) {
	const { query, path = ".", caseSensitive = false } = options;
	if (!query || typeof query !== "string" || query.trim().length === 0) {
		throw new McpError(ErrorCode.InvalidRequest, "query is required");
	}

	const targetDir = resolveInsideRepo(path);
	const normalizedQuery = caseSensitive ? query : query.toLowerCase();

	const queue = [targetDir];
	const results = [];

	while (queue.length > 0 && results.length < MAX_SEARCH_RESULTS) {
		const current = queue.shift();
		if (!current) break;
		const entryStats = await stat(current);

		if (entryStats.isDirectory()) {
			const children = await readdir(current, { withFileTypes: true });
			for (const child of children) {
				const childPath = resolve(current, child.name);
				if (child.isDirectory()) {
					queue.push(childPath);
				} else if (child.isFile()) {
					queue.push(childPath);
				}
			}
		} else if (entryStats.isFile()) {
			if (entryStats.size > MAX_SEARCH_FILE_SIZE) continue;
			const content = await readFile(current, "utf8");
			const haystack = caseSensitive ? content : content.toLowerCase();
			const index = haystack.indexOf(normalizedQuery);
			if (index !== -1) {
				const previewStart = Math.max(0, index - 80);
				const previewEnd = Math.min(content.length, index + normalizedQuery.length + 80);
				results.push({
					file: relative(REPO_ROOT, current),
					snippet: content.slice(previewStart, previewEnd),
				});
			}
		}
	}

	return results;
}

class FilesystemServer extends Server {
	constructor() {
		super(
			{
				name: "political-sphere-filesystem",
				version: "1.0.0",
				description: "Repository filesystem access with safe guards",
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
					name: "list_directory",
					description: "List directory entries within the repository",
					inputSchema: {
						type: "object",
						properties: {
							path: { type: "string", description: "Relative path inside repo" },
							limit: { type: "number", description: "Maximum entries to return" },
						},
					},
				},
				{
					name: "read_file",
					description: "Read a small text file inside the repository",
					inputSchema: {
						type: "object",
						properties: {
							path: { type: "string" },
							encoding: { type: "string", description: "File encoding (default utf8)" },
						},
						required: ["path"],
					},
				},
				{
					name: "search_text",
					description: "Search for a text snippet within repository files",
					inputSchema: {
						type: "object",
						properties: {
							query: { type: "string" },
							path: { type: "string", description: "Directory to search in" },
							caseSensitive: { type: "boolean" },
						},
						required: ["query"],
					},
				},
			],
		};
	}

	async callTool(request) {
		const params = (request.params ?? {});
		const name = params.name;
		const args = (params.arguments ?? {}) ?? {};

		switch (name) {
			case "list_directory": {
				const directoryPath =
					typeof args.path === "string" && args.path.length > 0 ? args.path : ".";
				const limit =
					typeof args.limit === "number" && Number.isFinite(args.limit)
						? Math.max(1, Math.floor(args.limit))
						: undefined;
				const entries = await listDirectoryEntries(directoryPath, { limit });
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{ path: directoryPath, entries },
								null,
								2,
							),
						},
					],
				};
			}

			case "read_file": {
				if (typeof args.path !== "string") {
					throw new McpError(ErrorCode.InvalidRequest, "path is required");
				}
				const encoding =
					typeof args.encoding === "string" && args.encoding.length > 0
						? args.encoding
						: "utf8";
				const content = await readFileSafe(args.path, encoding);
				return { content: [{ type: "text", text: String(content) }] };
			}

			case "search_text": {
				const results = await searchText({
					query: typeof args.query === "string" ? args.query : "",
					path: typeof args.path === "string" ? args.path : ".",
					caseSensitive: Boolean(args.caseSensitive),
				});
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({ results }, null, 2),
						},
					],
				};
			}

			default:
				throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
		}
	}

	async listResources() {
		return {
			resources: [
				{
					uri: "filesystem://political-sphere/root",
					name: "Repository root",
					description: "Top-level directories and files in the repository",
					mimeType: "application/json",
				},
				{
					uri: "filesystem://political-sphere/docs",
					name: "Documentation",
					description: "Primary documentation folder tree",
					mimeType: "application/json",
				},
				{
					uri: "filesystem://political-sphere/apps",
					name: "Applications",
					description: "Application packages available in the repository",
					mimeType: "application/json",
				},
			],
		};
	}

	async readResource(request) {
		const uri = request.params?.uri;
		switch (uri) {
			case "filesystem://political-sphere/root": {
				const entries = await listDirectoryEntries(".", { limit: 200 });
				return {
					contents: [
						{
							uri,
							mimeType: "application/json",
							text: JSON.stringify(entries, null, 2),
						},
					],
				};
			}
			case "filesystem://political-sphere/docs": {
				const entries = await listDirectoryEntries("docs", { limit: 200 });
				return {
					contents: [
						{
							uri,
							mimeType: "application/json",
							text: JSON.stringify(entries, null, 2),
						},
					],
				};
			}
			case "filesystem://political-sphere/apps": {
				const entries = await listDirectoryEntries("apps", { limit: 200 });
				return {
					contents: [
						{
							uri,
							mimeType: "application/json",
							text: JSON.stringify(entries, null, 2),
						},
					],
				};
			}
			default:
				throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
		}
	}
}

async function main() {
	const server = new FilesystemServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Filesystem MCP server ready on STDIO");
}

main().catch((error) => {
	console.error("Filesystem MCP server failed:", error);
	process.exitCode = 1;
});
