import { readdir } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
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
const MAX_ROWS = 100;

const DEFAULT_SCAN_DIRECTORIES = ["data", "apps/api", "apps/worker", "reports", "."]; // last is root for test DBs

function resolveSafeDbPath(dbPath) {
	const absolute = resolve(REPO_ROOT, dbPath);
	if (!absolute.startsWith(REPO_ROOT)) {
		throw new McpError(ErrorCode.InvalidRequest, "dbPath escapes repository root");
	}
	return absolute;
}

function validateSelectQuery(query) {
	const trimmed = query.trim().toLowerCase();
	if (!trimmed.startsWith("select")) {
		throw new McpError(ErrorCode.InvalidRequest, "Only SELECT queries are allowed");
	}
	const forbidden = ["update ", "insert ", "delete ", "alter ", "drop ", "pragma ", "attach "];
	if (forbidden.some((keyword) => trimmed.includes(keyword))) {
		throw new McpError(ErrorCode.InvalidRequest, "Query contains forbidden statements");
	}
	return query;
}

async function discoverDatabases() {
	const discovered = new Set();

	for (const directory of DEFAULT_SCAN_DIRECTORIES) {
		const absoluteDir = resolve(REPO_ROOT, directory);
		try {
			const entries = await readdir(absoluteDir, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.isFile() && extname(entry.name) === ".db") {
					const absolute = resolve(absoluteDir, entry.name);
					if (absolute.startsWith(REPO_ROOT)) {
						discovered.add(relative(REPO_ROOT, absolute));
					}
				}
			}
		} catch {
			// directory may not exist, ignore
		}
	}

	return Array.from(discovered).sort();
}

function listTables(dbPath) {
	const db = new Database(dbPath, { readonly: true, fileMustExist: true });
	try {
		const rows = db
			.prepare(
				"select name, type from sqlite_master where type in ('table','view') order by name asc",
			)
			.all();
		return rows;
	} finally {
		db.close();
	}
}

function tableInfo(dbPath, table) {
	const db = new Database(dbPath, { readonly: true, fileMustExist: true });
	try {
		const pragma = db.prepare(`pragma table_info(${table})`).all();
		return pragma.map((row) => ({
			cid: row.cid,
			name: row.name,
			type: row.type,
			notnull: Boolean(row.notnull),
			dflt_value: row.dflt_value,
			pk: Boolean(row.pk),
		}));
	} finally {
		db.close();
	}
}

function runSelect(dbPath, query, params) {
	const db = new Database(dbPath, { readonly: true, fileMustExist: true });
	try {
		const statement = db.prepare(query);
		const limited = statement.raw().all(params ?? {}).slice(0, MAX_ROWS);
		return limited;
	} finally {
		db.close();
	}
}

class SqliteServer extends Server {
	constructor() {
		super(
			{
				name: "political-sphere-sqlite",
				version: "1.0.0",
				description: "Query SQLite datasets in a read-only manner",
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
					name: "sqlite_list_tables",
					description: "List tables in a database file",
					inputSchema: {
						type: "object",
						properties: {
							dbPath: { type: "string", description: "Relative path to .db file" },
						},
						required: ["dbPath"],
					},
				},
				{
					name: "sqlite_table_info",
					description: "Describe columns in a table",
					inputSchema: {
						type: "object",
						properties: {
							dbPath: { type: "string" },
							table: { type: "string" },
						},
						required: ["dbPath", "table"],
					},
				},
				{
					name: "sqlite_query",
					description: "Run a read-only SELECT query (max 100 rows)",
					inputSchema: {
						type: "object",
						properties: {
							dbPath: { type: "string" },
							query: { type: "string" },
							params: {
								type: "object",
								description: "Named parameters mapping (optional)",
							},
						},
						required: ["dbPath", "query"],
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
			case "sqlite_list_tables": {
				if (typeof args.dbPath !== "string") {
					throw new McpError(ErrorCode.InvalidRequest, "dbPath is required");
				}
				const dbPath = resolveSafeDbPath(args.dbPath);
				const tables = listTables(dbPath);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({ dbPath: args.dbPath, tables }, null, 2),
						},
					],
				};
			}

			case "sqlite_table_info": {
				if (typeof args.dbPath !== "string" || typeof args.table !== "string") {
					throw new McpError(ErrorCode.InvalidRequest, "dbPath and table are required");
				}
				const dbPath = resolveSafeDbPath(args.dbPath);
				const info = tableInfo(dbPath, args.table);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({ table: args.table, columns: info }, null, 2),
						},
					],
				};
			}

			case "sqlite_query": {
				if (typeof args.dbPath !== "string" || typeof args.query !== "string") {
					throw new McpError(ErrorCode.InvalidRequest, "dbPath and query are required");
				}
				const statement = validateSelectQuery(args.query);
				const dbPath = resolveSafeDbPath(args.dbPath);
				const rows = runSelect(dbPath, statement, args.params);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({ rows, rowCount: rows.length }, null, 2),
						},
					],
				};
			}

			default:
				throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
		}
	}

	async listResources() {
		const databases = await discoverDatabases();
		return {
			resources: [
				{
					uri: "sqlite://political-sphere/databases",
					name: "Known SQLite databases",
					description: "Auto-discovered database files within the repository",
					mimeType: "application/json",
				},
				{
					uri: "sqlite://political-sphere/usage",
					name: "Usage guidance",
					description: "Hints for safe database queries",
					mimeType: "text/plain",
				},
			],
			databases,
		};
	}

	async readResource(request) {
		const uri = request.params?.uri;
		if (uri === "sqlite://political-sphere/databases") {
			const databases = await discoverDatabases();
			return {
				contents: [
					{
						uri,
						mimeType: "application/json",
						text: JSON.stringify({ databases }, null, 2),
					},
				],
			};
		}
		if (uri === "sqlite://political-sphere/usage") {
			return {
				contents: [
					{
						uri,
						mimeType: "text/plain",
						text: `All queries are executed in read-only mode. Only SELECT statements are permitted and results are limited to ${MAX_ROWS} rows.`,
					},
				],
			};
		}
		throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
	}
}

async function main() {
	const server = new SqliteServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("SQLite MCP server ready on STDIO");
}

main().catch((error) => {
	console.error("SQLite MCP server failed:", error);
	process.exitCode = 1;
});
