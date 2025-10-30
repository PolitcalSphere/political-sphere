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
import { Octokit } from '@octokit/rest';

class GitHubMCPServer extends Server {
  private octokit: Octokit;

  constructor() {
    super({
      name: 'political-sphere-github',
      version: '1.0.0',
    });

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    this.octokit = new Octokit({ auth: token });

    this.setRequestHandler(ListToolsRequestSchema, this.handleListTools.bind(this));
    this.setRequestHandler(CallToolRequestSchema, this.handleCallTool.bind(this));
    this.setRequestHandler(ListResourcesRequestSchema, this.handleListResources.bind(this));
    this.setRequestHandler(ReadResourceRequestSchema, this.handleReadResource.bind(this));
  }

  async handleListTools() {
    return {
      tools: [
        {
          name: 'get_repo_info',
          description: 'Get information about a GitHub repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: {
                type: 'string',
                description: 'Repository owner/organization',
              },
              repo: {
                type: 'string',
                description: 'Repository name',
              },
            },
            required: ['owner', 'repo'],
          },
        },
        {
          name: 'list_issues',
          description: 'List issues in a repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: {
                type: 'string',
                description: 'Repository owner/organization',
              },
              repo: {
                type: 'string',
                description: 'Repository name',
              },
              state: {
                type: 'string',
                enum: ['open', 'closed', 'all'],
                description: 'Issue state filter',
              },
              labels: {
                type: 'string',
                description: 'Comma-separated list of labels to filter by',
              },
            },
            required: ['owner', 'repo'],
          },
        },
        {
          name: 'get_pull_request',
          description: 'Get details of a pull request',
          inputSchema: {
            type: 'object',
            properties: {
              owner: {
                type: 'string',
                description: 'Repository owner/organization',
              },
              repo: {
                type: 'string',
                description: 'Repository name',
              },
              pull_number: {
                type: 'number',
                description: 'Pull request number',
              },
            },
            required: ['owner', 'repo', 'pull_number'],
          },
        },
        {
          name: 'search_repositories',
          description: 'Search for repositories on GitHub',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              sort: {
                type: 'string',
                enum: ['stars', 'forks', 'updated'],
                description: 'Sort criteria',
              },
              order: {
                type: 'string',
                enum: ['asc', 'desc'],
                description: 'Sort order',
              },
            },
            required: ['query'],
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
      case 'get_repo_info':
        return await this.getRepoInfo(typedArgs as { owner: string; repo: string });
      case 'list_issues':
        return await this.listIssues(typedArgs as {
          owner: string;
          repo: string;
          state?: string;
          labels?: string;
        });
      case 'get_pull_request':
        return await this.getPullRequest(typedArgs as {
          owner: string;
          repo: string;
          pull_number: number;
        });
      case 'search_repositories':
        return await this.searchRepositories(typedArgs as {
          query: string;
          sort?: string;
          order?: string;
        });
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  }

  private async getRepoInfo(args: { owner: string; repo: string }) {
    try {
      const response = await this.octokit.repos.get({
        owner: args.owner,
        repo: args.repo,
      });

      const repo = response.data;
      const info = {
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        issues: repo.open_issues_count,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        topics: repo.topics,
        license: repo.license?.name,
        default_branch: repo.default_branch,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(info, null, 2) }],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get repository info: ${error.message}`
      );
    }
  }

  private async listIssues(args: {
    owner: string;
    repo: string;
    state?: string;
    labels?: string;
  }) {
    try {
      const params: any = {
        owner: args.owner,
        repo: args.repo,
        state: args.state || 'open',
        per_page: 20,
      };

      if (args.labels) {
        params.labels = args.labels.split(',').map((l: string) => l.trim());
      }

      const response = await this.octokit.issues.listForRepo(params);

      const issues = response.data.map(issue => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        url: issue.html_url,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        labels: issue.labels.map((label: any) => ({
          name: label.name,
          color: label.color,
        })),
        assignee: issue.assignee?.login,
        comments: issue.comments,
      }));

      return {
        content: [{ type: 'text', text: JSON.stringify(issues, null, 2) }],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list issues: ${error.message}`
      );
    }
  }

  private async getPullRequest(args: {
    owner: string;
    repo: string;
    pull_number: number;
  }) {
    try {
      const response = await this.octokit.pulls.get({
        owner: args.owner,
        repo: args.repo,
        pull_number: args.pull_number,
      });

      const pr = response.data;
      const info = {
        number: pr.number,
        title: pr.title,
        state: pr.state,
        url: pr.html_url,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        merged: pr.merged,
        mergeable: pr.mergeable,
        head: {
          ref: pr.head.ref,
          sha: pr.head.sha,
        },
        base: {
          ref: pr.base.ref,
          sha: pr.base.sha,
        },
        author: pr.user?.login,
        reviewers: pr.requested_reviewers?.map((r: any) => r.login),
        labels: pr.labels.map((label: any) => ({
          name: label.name,
          color: label.color,
        })),
        commits: pr.commits,
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changed_files,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(info, null, 2) }],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get pull request: ${error.message}`
      );
    }
  }

  private async searchRepositories(args: {
    query: string;
    sort?: string;
    order?: string;
  }) {
    try {
      const response = await this.octokit.search.repos({
        q: args.query,
        sort: args.sort as any,
        order: args.order as any,
        per_page: 10,
      });

      const repos = response.data.items.map(repo => ({
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        issues: repo.open_issues_count,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
      }));

      return {
        content: [{ type: 'text', text: JSON.stringify(repos, null, 2) }],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to search repositories: ${error.message}`
      );
    }
  }

  async handleListResources() {
    return {
      resources: [
        {
          uri: 'github://current-repo',
          name: 'Current Repository Info',
          description: 'Information about the current repository',
          mimeType: 'application/json',
        },
      ],
    };
  }

  async handleReadResource(request: any) {
    const { uri } = request.params;

    if (uri === 'github://current-repo') {
      // Try to get current repo from git config or environment
      const repoInfo = process.env.GITHUB_REPOSITORY;
      if (!repoInfo) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Current repository not configured. Set GITHUB_REPOSITORY environment variable.'
        );
      }

      const [owner, repo] = repoInfo.split('/');
      return await this.getRepoInfo({ owner, repo });
    }

    throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
  }
}

async function main() {
  const server = new GitHubMCPServer();
  const transport = new StdioServerTransport();
  await (server as any).connect(transport);
  console.error('Political Sphere GitHub MCP server running...');
}

main().catch(console.error);
