import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import path from 'path';

class SQLiteMCPServer extends Server {
  private db: Database.Database | null = null;
  private dbPath: string | null = null;

  constructor() {
    super({
      name: 'political-sphere-sqlite',
      version: '1.0.0',
    });

    this.setRequestHandler(ListToolsRequestSchema, this.handleListTools.bind(this));
    this.setRequestHandler(CallToolRequestSchema, this.handleCallTool.bind(this));
    this.setRequestHandler(ListResourcesRequestSchema, this.handleListResources.bind(this));
    this.setRequestHandler(ReadResourceRequestSchema, this.handleReadResource.bind(this));

    // Initialize database connection
    this.initializeDatabase();
  }

  private initializeDatabase() {
    // Database will be initialized when connect_db tool is called
    console.log('SQLite MCP server initialized - waiting for database connection');
  }

  async handleListTools() {
    return {
      tools: [
        {
          name: 'connect_db',
          description: 'Connect to a SQLite database file',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the SQLite database file',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'execute_query',
          description: 'Execute a SQL query (SELECT only for safety)',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'SQL query to execute (SELECT only)',
              },
              params: {
                type: 'array',
                description: 'Query parameters',
                items: { type: 'string' },
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'list_tables',
          description: 'List all tables in the connected database',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_table_schema',
          description: 'Get schema information for a specific table',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Table name',
              },
            },
            required: ['table'],
          },
        },
        {
          name: 'disconnect_db',
          description: 'Disconnect from the current database',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    };
  }

  async handleCallTool(request: any) {
    const { name, arguments: args } = request.params;

    if (!args || typeof args !== 'object') {
      throw new McpError(ErrorCode.InvalidRequest, 'Invalid arguments');
    }

    const typedArgs = args as Record<string, unknown>;

    switch (name) {
      case 'connect_db':
        return await this.connectDB(typedArgs as { path: string });
      case 'execute_query':
        return await this.executeQuery(typedArgs as { query: string; params?: string[] });
      case 'list_tables':
        return await this.listTables();
      case 'get_table_schema':
        return await this.getTableSchema(typedArgs as { table: string });
      case 'disconnect_db':
        return await this.disconnectDB();
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  }

  private async connectDB(args: { path: string }) {
    try {
      // Security: only allow access to specific directories
      const allowedDirs = [
        process.cwd(),
        path.join(process.cwd(), 'data'),
        path.join(process.cwd(), 'db'),
      ];

      const resolvedPath = path.resolve(args.path);
      const isAllowed = allowedDirs.some(dir => resolvedPath.startsWith(dir));

      if (!isAllowed) {
        throw new McpError(ErrorCode.InvalidRequest, 'Database path not allowed');
      }

      // Close existing connection if any
      if (this.db) {
        this.db.close();
      }

      this.db = new Database(resolvedPath);
      this.dbPath = resolvedPath;

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');

      return {
        content: [{ type: 'text', text: `Connected to database: ${resolvedPath}` }],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to connect to database: ${error.message}`
      );
    }
  }

  private async executeQuery(args: { query: string; params?: string[] }) {
    if (!this.db) {
      throw new McpError(ErrorCode.InvalidRequest, 'No database connected');
    }

    try {
      // Security: only allow SELECT queries
      const query = args.query.trim().toUpperCase();
      if (!query.startsWith('SELECT')) {
        throw new McpError(ErrorCode.InvalidRequest, 'Only SELECT queries are allowed');
      }

      const stmt = this.db.prepare(args.query);
      const params = args.params || [];
      const results = stmt.all(...params);

      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to execute query: ${error.message}`
      );
    }
  }

  private async listTables() {
    if (!this.db) {
      throw new McpError(ErrorCode.InvalidRequest, 'No database connected');
    }

    try {
      const query = `
        SELECT name FROM sqlite_master
        WHERE type='table'
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `;
      const stmt = this.db.prepare(query);
      const results = stmt.all();

      const tables = results.map((row: any) => row.name);

      return {
        content: [{ type: 'text', text: JSON.stringify(tables, null, 2) }],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list tables: ${error.message}`
      );
    }
  }

  private async getTableSchema(args: { table: string }) {
    if (!this.db) {
      throw new McpError(ErrorCode.InvalidRequest, 'No database connected');
    }

    try {
      // Validate table name to prevent SQL injection
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(args.table)) {
        throw new McpError(ErrorCode.InvalidRequest, 'Invalid table name');
      }

      const query = `PRAGMA table_info(${args.table})`;
      const stmt = this.db.prepare(query);
      const columns = stmt.all();

      const schema = {
        table: args.table,
        columns: columns.map((col: any) => ({
          name: col.name,
          type: col.type,
          notnull: col.notnull,
          pk: col.pk,
          dflt_value: col.dflt_value,
        })),
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(schema, null, 2) }],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get table schema: ${error.message}`
      );
    }
  }

  private async disconnectDB() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.dbPath = null;

      return {
        content: [{ type: 'text', text: 'Disconnected from database' }],
      };
    } else {
      return {
        content: [{ type: 'text', text: 'No database connection to close' }],
      };
    }
  }

  async handleListResources() {
    const resources = [];

    if (this.dbPath) {
      resources.push({
        uri: `sqlite://current-db`,
        name: 'Current Database Info',
        description: 'Information about the currently connected database',
        mimeType: 'application/json',
      });
    }

    return { resources };
  }

  async handleReadResource(request: any) {
    const { uri } = request.params;

    if (uri === 'sqlite://current-db' && this.dbPath) {
      const info = {
        path: this.dbPath,
        connected: this.db !== null,
        tables: this.db ? await this.getTableNames() : [],
      };

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    }

    throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
  }

  private async getTableNames(): Promise<string[]> {
    if (!this.db) return [];

    try {
      const query = `
        SELECT name FROM sqlite_master
        WHERE type='table'
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `;
      const stmt = this.db.prepare(query);
      const results = stmt.all();
      return results.map((row: any) => row.name);
    } catch {
      return [];
    }
  }
}

async function main() {
  const server = new SQLiteMCPServer();
  const transport = new StdioServerTransport();
  await (server as any).connect(transport);
  console.error('Political Sphere SQLite MCP server running...');
}

main().catch(console.error);
