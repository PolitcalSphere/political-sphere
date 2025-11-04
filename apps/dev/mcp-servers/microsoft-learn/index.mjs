import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
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
const DATA_PATH = resolve(MODULE_DIR, "topics.json");

let cachedTopics = null;

async function loadTopics() {
	if (!cachedTopics) {
		const raw = await readFile(DATA_PATH, "utf8");
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			throw new Error("Invalid topics.json schema");
		}
		cachedTopics = parsed;
	}
	return cachedTopics;
}

function matchScore(topic, keyword) {
	const haystack = `${topic.title} ${topic.summary} ${topic.skills.join(" ")}`.toLowerCase();
	const normalized = keyword.toLowerCase();
	if (haystack.includes(normalized)) {
		return normalized.length / haystack.length;
	}
	return 0;
}

class MicrosoftLearnServer extends Server {
	constructor() {
		super(
			{
				name: "political-sphere-microsoft-learn",
				version: "1.0.0",
				description: "Offline Microsoft Learn index for quick discovery",
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
					name: "learn_search",
					description: "Search Microsoft Learn topics by keyword",
					inputSchema: {
						type: "object",
						properties: {
							keyword: { type: "string" },
							limit: { type: "number", description: "Maximum results (default 5)" },
						},
						required: ["keyword"],
					},
				},
				{
					name: "learn_topic",
					description: "Get details for a specific topic by id",
					inputSchema: {
						type: "object",
						properties: {
							id: { type: "string" },
						},
						required: ["id"],
					},
				},
				{
					name: "learn_recommend_for_skill",
					description: "Recommend topics aligned to a target skill area",
					inputSchema: {
						type: "object",
						properties: {
							skill: { type: "string" },
							limit: { type: "number", description: "Maximum results (default 5)" },
						},
						required: ["skill"],
					},
				},
			],
		};
	}

	async callTool(request) {
		const params = request.params ?? {};
		const name = params.name;
		const args = (params.arguments ?? {}) ?? {};
		const topics = await loadTopics();

		switch (name) {
			case "learn_search": {
				const keyword = typeof args.keyword === "string" ? args.keyword.trim() : "";
				if (!keyword) {
					throw new McpError(ErrorCode.InvalidRequest, "keyword is required");
				}
				const limit =
					typeof args.limit === "number" && Number.isFinite(args.limit)
						? Math.min(Math.max(1, Math.floor(args.limit)), 10)
						: 5;

				const ranked = topics
					.map((topic) => ({ topic, score: matchScore(topic, keyword) }))
					.filter((item) => item.score > 0)
					.sort((a, b) => b.score - a.score)
					.slice(0, limit)
					.map(({ topic }) => topic);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({ keyword, results: ranked }, null, 2),
						},
					],
				};
			}

			case "learn_topic": {
				const id = typeof args.id === "string" ? args.id : "";
				const topic = topics.find((candidate) => candidate.id === id);
				if (!topic) {
					throw new McpError(ErrorCode.InvalidRequest, `Unknown topic id: ${id}`);
				}
				return { content: [{ type: "text", text: JSON.stringify(topic, null, 2) }] };
			}

			case "learn_recommend_for_skill": {
				const skill = typeof args.skill === "string" ? args.skill.toLowerCase() : "";
				if (!skill) {
					throw new McpError(ErrorCode.InvalidRequest, "skill is required");
				}
				const limit =
					typeof args.limit === "number" && Number.isFinite(args.limit)
						? Math.min(Math.max(1, Math.floor(args.limit)), 10)
						: 5;

				const results = topics
					.filter((topic) =>
						topic.skills.some((candidate) => candidate.toLowerCase().includes(skill)),
					)
					.slice(0, limit);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({ skill, results }, null, 2),
						},
					],
				};
			}

			default:
				throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
		}
	}

	async listResources() {
		const topics = await loadTopics();
		return {
			resources: [
				{
					uri: "learn://political-sphere/topics",
					name: "Topic catalog",
					description: "Cached Microsoft Learn topics for offline exploration",
					mimeType: "application/json",
				},
			],
			count: topics.length,
		};
	}

	async readResource(request) {
		const uri = request.params?.uri;
		if (uri === "learn://political-sphere/topics") {
			const topics = await loadTopics();
			return {
				contents: [
					{
						uri,
						mimeType: "application/json",
						text: JSON.stringify({ topics }, null, 2),
					},
				],
			};
		}
		throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
	}
}

async function main() {
	const server = new MicrosoftLearnServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Microsoft Learn MCP server ready on STDIO");
}

main().catch((error) => {
	console.error("Microsoft Learn MCP server failed:", error);
	process.exitCode = 1;
});
