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

const DEFAULT_DOC_FOLDERS = ["docs", "apps", "libs", "ai"];

async function listDocuments(folder, limit = 50) {
	const absolute = resolve(REPO_ROOT, folder);
	if (!absolute.startsWith(REPO_ROOT)) {
		throw new McpError(ErrorCode.InvalidRequest, "Folder escapes repository root");
	}
	const entries = await readdir(absolute, { withFileTypes: true });
	const results = [];

	for (const entry of entries) {
		const entryPath = resolve(absolute, entry.name);
		if (!entryPath.startsWith(REPO_ROOT)) continue;
		const info = await stat(entryPath);
		if (entry.isFile() && entry.name.match(/\.(md|mdx|txt|json)$/i)) {
			results.push({
				path: relative(REPO_ROOT, entryPath),
				size: info.size,
				updatedAt: info.mtime.toISOString(),
			});
		}
	}

	return results.slice(0, limit);
}

async function previewDocument(path, options = {}) {
	const absolute = resolve(REPO_ROOT, path);
	if (!absolute.startsWith(REPO_ROOT)) {
		throw new McpError(ErrorCode.InvalidRequest, "Path escapes repository root");
	}
	const content = await readFile(absolute, "utf8");
	const lines = content.split(/\r?\n/);
	const previewLines = Math.min(options.lines ?? 40, 120);
	return lines.slice(0, previewLines).join("\n");
}

async function searchDocuments(keyword, folders = DEFAULT_DOC_FOLDERS, limit = 10) {
	const normalized = keyword.trim().toLowerCase();
	if (!normalized) {
		throw new McpError(ErrorCode.InvalidRequest, "keyword is required");
	}
	const matches = [];

	for (const folder of folders) {
		const absolute = resolve(REPO_ROOT, folder);
		try {
			const entries = await readdir(absolute, { withFileTypes: true });
			for (const entry of entries) {
				if (!entry.isFile()) continue;
				if (!entry.name.match(/\.(md|mdx|txt|json)$/i)) continue;
				const entryPath = resolve(absolute, entry.name);
				const content = await readFile(entryPath, "utf8");
				const lower = content.toLowerCase();
				const index = lower.indexOf(normalized);
				if (index !== -1) {
					const start = Math.max(0, index - 120);
					const stop = Math.min(content.length, index + normalized.length + 120);
					matches.push({
						path: relative(REPO_ROOT, entryPath),
						snippet: content.slice(start, stop),
					});
					if (matches.length >= limit) {
						return matches;
					}
				}
			}
		} catch {
			// folder may not exist, ignore
		}
	}

	return matches;
}

async function extractGovernanceTasks() {
	const todoPath = resolve(REPO_ROOT, "docs/TODO.md");
	try {
		const content = await readFile(todoPath, "utf8");
		const lines = content.split(/\r?\n/);
		const tasks = [];
		for (const line of lines) {
			const match = line.match(/-\s+\[\s?([ xX])\s?\]\s+(.*)/);
			if (match) {
				tasks.push({ done: match[1] !== " ", description: match[2].trim() });
			}
		}
		return tasks;
	} catch {
		return [];
	}
}

class PoliticalSphereServer extends Server {
	constructor() {
		super(
			{
				name: "political-sphere",
				version: "1.0.0",
				description: "Domain-specific context and insights for Political Sphere",
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
					name: "ps_list_documents",
					description: "List key documentation files within the repository",
					inputSchema: {
						type: "object",
						properties: {
							folder: { type: "string", description: "Relative folder (default docs)" },
							limit: { type: "number", description: "Maximum files to return (default 25)" },
						},
					},
				},
				{
					name: "ps_preview_document",
					description: "Preview the first lines of a document",
					inputSchema: {
						type: "object",
						properties: {
							path: { type: "string" },
							lines: { type: "number", description: "Number of lines to include" },
						},
						required: ["path"],
					},
				},
				{
					name: "ps_search_topics",
					description: "Search domain documentation for a keyword",
					inputSchema: {
						type: "object",
						properties: {
							keyword: { type: "string" },
							folders: {
								type: "array",
								items: { type: "string" },
								description: "Folders to search (default docs, apps, libs, ai)",
							},
							limit: { type: "number" },
						},
						required: ["keyword"],
					},
				},
				{
					name: "ps_governance_tasks",
					description: "Extract governance TODO items from docs/TODO.md",
					inputSchema: {
						type: "object",
						properties: {},
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
			case "ps_list_documents": {
				const folder =
					typeof args.folder === "string" && args.folder.length > 0 ? args.folder : "docs";
				const limit =
					typeof args.limit === "number" && Number.isFinite(args.limit)
						? Math.min(Math.max(1, Math.floor(args.limit)), 200)
						: 25;
				const documents = await listDocuments(folder, limit);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({ folder, documents }, null, 2),
						},
					],
				};
			}

			case "ps_preview_document": {
				if (typeof args.path !== "string") {
					throw new McpError(ErrorCode.InvalidRequest, "path is required");
				}
				const lines =
					typeof args.lines === "number" && Number.isFinite(args.lines)
						? Math.min(Math.max(5, Math.floor(args.lines)), 200)
						: 40;
				const preview = await previewDocument(args.path, { lines });
				return { content: [{ type: "text", text: preview }] };
			}

			case "ps_search_topics": {
				const folders =
					Array.isArray(args.folders) && args.folders.length > 0
						? args.folders.map(String)
						: DEFAULT_DOC_FOLDERS;
				const limit =
					typeof args.limit === "number" && Number.isFinite(args.limit)
						? Math.min(Math.max(1, Math.floor(args.limit)), 30)
						: 10;
				const results = await searchDocuments(String(args.keyword ?? ""), folders, limit);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({ keyword: args.keyword, results }, null, 2),
						},
					],
				};
			}

			case "ps_governance_tasks": {
				const tasks = await extractGovernanceTasks();
				return { content: [{ type: "text", text: JSON.stringify({ tasks }, null, 2) }] };
			}

			default:
				throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
		}
	}

	async listResources() {
		return {
			resources: [
				{
					uri: "political-sphere://docs/catalog",
					name: "Documentation catalog",
					description: "High-level list of important documentation folders",
					mimeType: "application/json",
				},
				{
					uri: "political-sphere://governance/todos",
					name: "Governance TODOs",
					description: "Current governance tasks captured in docs/TODO.md",
					mimeType: "application/json",
				},
			],
		};
	}

	async readResource(request) {
		const uri = request.params?.uri;
		if (uri === "political-sphere://docs/catalog") {
			const catalog = await Promise.all(
				DEFAULT_DOC_FOLDERS.map(async (folder) => {
					try {
						const entries = await listDocuments(folder, 15);
						return { folder, count: entries.length };
					} catch {
						return { folder, count: 0 };
					}
				}),
			);
			return {
				contents: [
					{
						uri,
						mimeType: "application/json",
						text: JSON.stringify({ folders: catalog }, null, 2),
					},
				],
			};
		}
		if (uri === "political-sphere://governance/todos") {
			const tasks = await extractGovernanceTasks();
			return {
				contents: [
					{
						uri,
						mimeType: "application/json",
						text: JSON.stringify({ tasks }, null, 2),
					},
				],
			};
		}
		throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
	}
}

async function main() {
	const server = new PoliticalSphereServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Political Sphere MCP server ready on STDIO");
}

main().catch((error) => {
	console.error("Political Sphere MCP server failed:", error);
	process.exitCode = 1;
});
