# MCP Servers Setup Guide

This document provides setup instructions for the Model Context Protocol (MCP) servers integrated into the Political Sphere project.

## Overview

The project includes several MCP servers to enhance AI capabilities:

- **Filesystem MCP Server**: Secure file operations and code analysis
- **GitHub MCP Server**: Repository management and GitHub API integration
- **SQLite MCP Server**: Database queries and data analysis
- **Puppeteer MCP Server**: Web automation and scraping
- **Git MCP Server**: Git operations and version control
- **AI Assistant MCP Server**: Custom AI-powered development assistance

## Prerequisites

- Node.js 18+
- npm or yarn
- GitHub Personal Access Token (for GitHub MCP server)
- SQLite database files (for SQLite MCP server)

## Installation

All MCP servers are installed as part of the project dependencies. Run the following commands:

```bash
# Install root dependencies
npm install

# Install MCP server dependencies
cd apps/dev/mcp-servers/filesystem && npm install
cd apps/dev/mcp-servers/github && npm install
cd apps/dev/mcp-servers/sqlite && npm install
cd apps/dev/mcp-servers/puppeteer && npm install
cd apps/dev/mcp-servers/git && npm install
```

## Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# GitHub MCP Server
GITHUB_TOKEN=your_github_personal_access_token_here
GITHUB_REPOSITORY=your-org/your-repo

# Database paths (optional, defaults to project directories)
SQLITE_DB_PATH=./data/database.db
```

### GitHub Token Setup

1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate a new token with the following scopes:
   - `repo` (Full control of private repositories)
   - `read:org` (Read org and team membership)
   - `read:user` (Read user profile data)
3. Add the token to your `.env` file

## Running MCP Servers

Use the provided npm scripts to start individual servers:

```bash
# Start individual servers
npm run mcp:filesystem
npm run mcp:github
npm run mcp:sqlite
npm run mcp:puppeteer
npm run mcp:git
npm run mcp:ai-assistant

# Or start multiple servers concurrently
npx concurrently "npm run mcp:filesystem" "npm run mcp:github" "npm run mcp:ai-assistant"
```

## VSCode/Copilot Integration

### MCP Client Configuration

To integrate with GitHub Copilot Chat, create or update your MCP client configuration:

1. Create `.vscode/mcp.json` in your workspace:

```json
{
  "mcpServers": {
    "political-sphere-filesystem": {
      "command": "npm",
      "args": ["run", "mcp:filesystem"],
      "cwd": "${workspaceFolder}"
    },
    "political-sphere-github": {
      "command": "npm",
      "args": ["run", "mcp:github"],
      "cwd": "${workspaceFolder}",
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}",
        "GITHUB_REPOSITORY": "${env:GITHUB_REPOSITORY}"
      }
    },
    "political-sphere-sqlite": {
      "command": "npm",
      "args": ["run", "mcp:sqlite"],
      "cwd": "${workspaceFolder}"
    },
    "political-sphere-puppeteer": {
      "command": "npm",
      "args": ["run", "mcp:puppeteer"],
      "cwd": "${workspaceFolder}"
    },
    "political-sphere-git": {
      "command": "npm",
      "args": ["run", "mcp:git"],
      "cwd": "${workspaceFolder}"
    },
    "political-sphere-ai-assistant": {
      "command": "npm",
      "args": ["run", "mcp:ai-assistant"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

2. Reload VSCode to apply the configuration.

### Using MCP Servers with Copilot

Once configured, you can use the MCP servers in Copilot Chat:

```
@political-sphere-filesystem read this file: package.json
@political-sphere-github get repo info for microsoft/vscode
@political-sphere-sqlite connect to database.db and list tables
@political-sphere-puppeteer navigate to https://example.com
@political-sphere-git get status of current repo
@political-sphere-ai-assistant generate code for user authentication
```

## Server Capabilities

### Filesystem Server
- Read files securely within allowed paths
- List directory contents
- Search for files with glob patterns

### GitHub Server
- Get repository information
- List and search issues
- Get pull request details
- Search repositories

### SQLite Server
- Connect to SQLite databases
- Execute SELECT queries (read-only)
- List tables and schemas

### Puppeteer Server
- Launch headless browsers
- Navigate to web pages
- Extract content and take screenshots
- Interact with web elements

### Git Server
- Initialize repositories
- Get status and logs
- Stage and commit changes
- Create and checkout branches
- Push and pull from remotes

### AI Assistant Server
- Generate code following Political Sphere standards
- Review code for quality and security
- Optimize performance
- Generate tests
- Simulate scenarios

## Security Considerations

- **Path Restrictions**: Filesystem and Git servers only allow access to specific directories
- **Read-Only Operations**: SQLite server only allows SELECT queries
- **URL Validation**: Puppeteer server only allows HTTP/HTTPS URLs
- **Token Security**: GitHub tokens should be stored securely and rotated regularly
- **Input Validation**: All servers validate inputs to prevent injection attacks

## Troubleshooting

### Common Issues

1. **MCP Server not connecting**
   - Check that the server is running
   - Verify environment variables are set
   - Check server logs for errors

2. **GitHub API rate limits**
   - Monitor API usage
   - Consider using GitHub App instead of personal token for higher limits

3. **SQLite compilation errors**
   - Ensure Python and build tools are installed
   - Try using a pre-compiled binary version

4. **Puppeteer browser launch failures**
   - Install browser dependencies: `npx puppeteer browsers install chrome`
   - Check system permissions for browser launch

### Logs and Debugging

Each server outputs logs to stderr. Use the following to debug:

```bash
# Run with verbose logging
DEBUG=* npm run mcp:filesystem

# Check server health
curl http://localhost:port/health  # If implemented
```

## Development

### Adding New Tools

To add new tools to existing servers:

1. Update the `handleListTools` method in the server
2. Implement the tool logic in the appropriate handler
3. Update this documentation

### Creating New Servers

1. Create a new directory under `apps/dev/mcp-servers/`
2. Follow the existing server structure
3. Add Nx configuration
4. Update package.json scripts
5. Update this documentation

## Contributing

When contributing to MCP server development:

- Follow the existing code patterns
- Add comprehensive error handling
- Include input validation
- Update tests and documentation
- Ensure security best practices

## License

This project follows the same license as the Political Sphere monorepo.
