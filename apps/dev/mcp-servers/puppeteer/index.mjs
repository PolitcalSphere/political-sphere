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
import puppeteer from "puppeteer";

const DEFAULT_TIMEOUT = 15000;

async function withBrowser(run) {
	const browser = await puppeteer.launch({
		headless: "new",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	try {
		return await run(browser);
	} finally {
		await browser.close();
	}
}

class PuppeteerServer extends Server {
	constructor() {
		super(
			{
				name: "political-sphere-puppeteer",
				version: "1.0.0",
				description: "Lightweight web automation via Puppeteer",
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
					name: "puppeteer_fetch_dom",
					description: "Fetch DOM content from a URL",
					inputSchema: {
						type: "object",
						properties: {
							url: { type: "string" },
							waitUntil: {
								type: "string",
								enum: ["load", "domcontentloaded", "networkidle0", "networkidle2"],
								description: "Navigation wait condition (default domcontentloaded)",
							},
							timeoutMs: {
								type: "number",
								description: "Navigation timeout in milliseconds",
							},
						},
						required: ["url"],
					},
				},
				{
					name: "puppeteer_screenshot",
					description: "Capture a screenshot of the given URL (base64 encoded)",
					inputSchema: {
						type: "object",
						properties: {
							url: { type: "string" },
							fullPage: { type: "boolean" },
							viewport: {
								type: "object",
								properties: {
									width: { type: "number" },
									height: { type: "number" },
								},
							},
							timeoutMs: { type: "number" },
						},
						required: ["url"],
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
			case "puppeteer_fetch_dom": {
				const url = typeof args.url === "string" ? args.url : null;
				if (!url) {
					throw new McpError(ErrorCode.InvalidRequest, "url is required");
				}
				const waitUntil =
					typeof args.waitUntil === "string"
						? args.waitUntil
						: "domcontentloaded";
				const timeout =
					typeof args.timeoutMs === "number" && Number.isFinite(args.timeoutMs)
						? Math.max(1000, Math.floor(args.timeoutMs))
						: DEFAULT_TIMEOUT;

				const dom = await withBrowser(async (browser) => {
					const page = await browser.newPage();
					await page.goto(url, { waitUntil, timeout });
					const content = await page.content();
					return content.slice(0, 50_000);
				});

				return { content: [{ type: "text", text: dom }] };
			}

			case "puppeteer_screenshot": {
				const url = typeof args.url === "string" ? args.url : null;
				if (!url) {
					throw new McpError(ErrorCode.InvalidRequest, "url is required");
				}
				const timeout =
					typeof args.timeoutMs === "number" && Number.isFinite(args.timeoutMs)
						? Math.max(1000, Math.floor(args.timeoutMs))
						: DEFAULT_TIMEOUT;

				const base64 = await withBrowser(async (browser) => {
					const page = await browser.newPage();
					if (args.viewport && typeof args.viewport === "object") {
						const width =
							typeof args.viewport.width === "number" ? args.viewport.width : 1280;
						const height =
							typeof args.viewport.height === "number" ? args.viewport.height : 720;
						await page.setViewport({ width, height });
					}
					await page.goto(url, { waitUntil: "networkidle2", timeout });
					const buffer = await page.screenshot({
						fullPage: Boolean(args.fullPage),
						type: "png",
					});
					return buffer.toString("base64");
				});

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{ url, image: base64, encoding: "base64" },
								null,
								2,
							),
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
					uri: "puppeteer://political-sphere/usage",
					name: "Usage guidance",
					description: "Tips for running Puppeteer tools efficiently",
					mimeType: "text/plain",
				},
			],
		};
	}

	async readResource(request) {
		const uri = request.params?.uri;
		if (uri === "puppeteer://political-sphere/usage") {
			return {
				contents: [
					{
						uri,
						mimeType: "text/plain",
						text: "Ensure headless Chrome can start in your environment. The server launches a new browser per request and closes it automatically.",
					},
				],
			};
		}
		throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
	}
}

async function main() {
	const server = new PuppeteerServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Puppeteer MCP server ready on STDIO");
}

main().catch((error) => {
	console.error("Puppeteer MCP server failed:", error);
	process.exitCode = 1;
});
