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
import { promises as fs } from 'fs';
import path from 'path';

class FilesystemMCPServer extends Server {
  private allowedPaths: string[] = [
    process.cwd(),
    path.join(process.cwd(), 'docs'),
    path.join(process.cwd(), 'apps'),
    path.join(process.cwd(), 'libs'),
    path.join(process.cwd(), 'scripts'),
  ];

  constructor() {
    super({
      name: 'political-sphere-filesystem',
      version: '1.0.0',
    });

    this.setRequestHandler(ListToolsRequestSchema, this.handleListTools.bind(this));
    this.setRequestHandler(CallToolRequestSchema, this.handleCallTool.bind(this));
    this.setRequestHandler(ListResourcesRequestSchema, this.handleListResources.bind(this));
    this.setRequestHandler(ReadResourceRequestSchema, this.handleReadResource.bind(this));
  }

  async handleListTools() {
    return {
      tools: [
        {
          name: 'read_file',
          description: 'Read the contents of a file',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the file to read',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'list_dir',
          description: 'List contents of a directory',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the directory to list',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'search_files',
          description: 'Search for files matching a pattern',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'Glob pattern to match files',
              },
              path: {
                type: 'string',
                description: 'Base path to search from',
              },
            },
            required: ['pattern'],
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
      case 'read_file':
        return await this.readFile(typedArgs as { path: string });
      case 'list_dir':
        return await this.listDir(typedArgs as { path: string });
      case 'search_files':
        return await this.searchFiles(typedArgs as { pattern: string; path?: string });
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  }

  private async readFile(args: { path: string }) {
    const filePath = path.resolve(args.path);

    if (!this.isPathAllowed(filePath)) {
      throw new McpError(ErrorCode.InvalidRequest, 'Access denied: path not allowed');
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        content: [{ type: 'text', text: content }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to read file: ${error}`);
    }
  }

  private async listDir(args: { path: string }) {
    const dirPath = path.resolve(args.path);

    if (!this.isPathAllowed(dirPath)) {
      throw new McpError(ErrorCode.InvalidRequest, 'Access denied: path not allowed');
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const result = entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        path: path.join(dirPath, entry.name),
      }));

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to list directory: ${error}`);
    }
  }

  private async searchFiles(args: { pattern: string; path?: string }) {
    const basePath = args.path ? path.resolve(args.path) : process.cwd();

    if (!this.isPathAllowed(basePath)) {
      throw new McpError(ErrorCode.InvalidRequest, 'Access denied: path not allowed');
    }

    try {
      const results = await this.globSearch(basePath, args.pattern);
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to search files: ${error}`);
    }
  }

  private async globSearch(basePath: string, pattern: string): Promise<string[]> {
    const results: string[] = [];

    async function search(this: FilesystemMCPServer, dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await search.call(this, fullPath);
        } else if (this.matchesPattern(entry.name, pattern)) {
          results.push(fullPath);
        }
      }
    }

    await search.call(this, basePath);
    return results;
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    // Simple glob matching - convert * to .* and ? to .
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    return regex.test(filename);
  }

  private isPathAllowed(filePath: string): boolean {
    const resolvedPath = path.resolve(filePath);
    return this.allowedPaths.some(allowedPath =>
      resolvedPath.startsWith(path.resolve(allowedPath))
    );
  }

  async handleListResources() {
    return {
      resources: [
        {
          uri: 'file://project-structure',
          name: 'Project Structure',
          description: 'Overview of the project directory structure',
          mimeType: 'application/json',
        },
      ],
    };
  }

  async handleReadResource(request: any) {
    const { uri } = request.params;

    if (uri === 'file://project-structure') {
      const structure = await this.getProjectStructure();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(structure, null, 2),
          },
        ],
      };
    }

    throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
  }

  private async getProjectStructure(): Promise<any> {
    const rootDir = process.cwd();

    async function buildTree(dir: string, depth = 0): Promise<any> {
      if (depth > 3) return { name: path.basename(dir), type: 'directory', truncated: true };

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const children = [];

        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue; // Skip hidden files

          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            children.push(await buildTree(fullPath, depth + 1));
          } else {
            children.push({ name: entry.name, type: 'file' });
          }
        }

        return {
          name: path.basename(dir),
          type: 'directory',
          children,
        };
      } catch {
        return { name: path.basename(dir), type: 'directory', error: 'access denied' };
      }
    }

    return await buildTree(rootDir);
  }
}

async function main() {
  const server = new FilesystemMCPServer();
  const transport = new StdioServerTransport();
  await (server as any).connect(transport);
  console.error('Political Sphere Filesystem MCP server running...');
}

main().catch(console.error);
