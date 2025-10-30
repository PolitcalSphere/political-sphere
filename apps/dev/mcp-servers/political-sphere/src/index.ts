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

class PoliticalSphereMCPServer extends Server {
  constructor() {
    super({
      name: 'political-sphere-custom',
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
          name: 'check_compliance',
          description: 'Check code compliance with Political Sphere standards and rules',
          inputSchema: {
            type: 'object',
            properties: {
              code: { type: 'string', description: 'Code to check for compliance' },
              filePath: { type: 'string', description: 'File path for context' },
            },
            required: ['code'],
          },
        },
        {
          name: 'validate_governance',
          description: 'Validate governance and constitutional compliance',
          inputSchema: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'Content to validate' },
              type: {
                type: 'string',
                enum: ['policy', 'code', 'documentation', 'decision'],
                description: 'Type of content to validate',
              },
            },
            required: ['content', 'type'],
          },
        },
        {
          name: 'audit_security',
          description: 'Perform security audit on code or configuration',
          inputSchema: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Code or config to audit' },
              type: {
                type: 'string',
                enum: ['code', 'config', 'secrets', 'permissions'],
                description: 'Type of security audit',
              },
            },
            required: ['target', 'type'],
          },
        },
        {
          name: 'generate_adr',
          description: 'Generate an Architecture Decision Record template',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Title of the decision' },
              context: { type: 'string', description: 'Context and background' },
              decision: { type: 'string', description: 'The decision made' },
            },
            required: ['title'],
          },
        },
        {
          name: 'check_dependencies',
          description: 'Check dependency compliance and security',
          inputSchema: {
            type: 'object',
            properties: {
              packageJson: { type: 'string', description: 'Package.json content to analyze' },
            },
            required: ['packageJson'],
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
      case 'check_compliance':
        return await this.checkCompliance(typedArgs as { code: string; filePath?: string });
      case 'validate_governance':
        return await this.validateGovernance(typedArgs as { content: string; type: string });
      case 'audit_security':
        return await this.auditSecurity(typedArgs as { target: string; type: string });
      case 'generate_adr':
        return await this.generateADR(typedArgs as { title: string; context?: string; decision?: string });
      case 'check_dependencies':
        return await this.checkDependencies(typedArgs as { packageJson: string });
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  }

  private async checkCompliance(args: { code: string; filePath?: string }) {
    const { code, filePath } = args;

    // Load compliance rules from .blackboxrules
    const rulesPath = path.join(process.cwd(), '.blackboxrules');
    let rulesContent = '';
    try {
      rulesContent = await fs.readFile(rulesPath, 'utf-8');
    } catch {
      rulesContent = 'Rules file not found';
    }

    // Basic compliance checks
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for kebab-case naming
    if (filePath && !filePath.includes('/') && !/^[a-z0-9-]+\.[a-z]+$/.test(path.basename(filePath))) {
      issues.push('File name should use kebab-case');
    }

    // Check for console.log in production code
    if (code.includes('console.log') && !filePath?.includes('test')) {
      issues.push('console.log found in non-test file');
    }

    // Check for TODO comments
    if (code.includes('TODO') || code.includes('FIXME')) {
      suggestions.push('TODO/FIXME comments found - consider addressing or documenting');
    }

    // Check for security issues
    if (code.includes('eval(') || code.includes('innerHTML')) {
      issues.push('Potential security vulnerability detected');
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              compliance: issues.length === 0 ? 'PASS' : 'FAIL',
              issues,
              suggestions,
              rulesReference: 'See .blackboxrules for detailed standards',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async validateGovernance(args: { content: string; type: string }) {
    const { content, type } = args;

    const validations: string[] = [];
    const concerns: string[] = [];

    // Governance checks based on type
    switch (type) {
      case 'policy':
        if (!content.includes('democratic') && !content.includes('governance')) {
          concerns.push('Policy should reference democratic principles');
        }
        if (!content.includes('transparency') && !content.includes('accountability')) {
          concerns.push('Policy should include transparency and accountability measures');
        }
        break;

      case 'code':
        if (content.includes('political') && !content.includes('neutral')) {
          concerns.push('Code involving political content should maintain neutrality');
        }
        break;

      case 'documentation':
        if (!content.includes('Last updated') || !content.includes('Version')) {
          concerns.push('Documentation should include version and update information');
        }
        break;

      case 'decision':
        if (!content.includes('Context') || !content.includes('Decision')) {
          concerns.push('Architecture decisions should follow ADR format');
        }
        break;
    }

    // Constitutional compliance
    if (content.toLowerCase().includes('unconstitutional')) {
      concerns.push('Content references unconstitutional actions');
    }

    validations.push(`Governance validation for ${type} content completed`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              validation: concerns.length === 0 ? 'APPROVED' : 'REVIEW_REQUIRED',
              validations,
              concerns,
              recommendations: concerns.length > 0 ? ['Consult governance committee', 'Document rationale'] : [],
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async auditSecurity(args: { target: string; type: string }) {
    const { target, type } = args;

    const findings: string[] = [];
    const recommendations: string[] = [];

    switch (type) {
      case 'code':
        if (target.includes('password') && target.includes('string')) {
          findings.push('Potential hardcoded password detected');
          recommendations.push('Use environment variables for secrets');
        }
        if (target.includes('eval(')) {
          findings.push('Use of eval() detected - security risk');
          recommendations.push('Avoid eval() - use safer alternatives');
        }
        if (target.includes('innerHTML')) {
          findings.push('Direct innerHTML manipulation detected');
          recommendations.push('Use textContent or sanitize input');
        }
        break;

      case 'config':
        if (target.includes('DEBUG=true') || target.includes('debug: true')) {
          findings.push('Debug mode enabled in configuration');
          recommendations.push('Disable debug mode in production');
        }
        break;

      case 'secrets':
        if (target.includes('ghp_') || target.includes('sk-')) {
          findings.push('API keys or tokens detected in code');
          recommendations.push('Move secrets to environment variables');
        }
        break;

      case 'permissions':
        if (target.includes('0777') || target.includes('777')) {
          findings.push('Overly permissive file permissions');
          recommendations.push('Use minimal required permissions');
        }
        break;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              auditType: type,
              riskLevel: findings.length > 2 ? 'HIGH' : findings.length > 0 ? 'MEDIUM' : 'LOW',
              findings,
              recommendations,
              nextSteps: findings.length > 0 ? ['Address critical findings immediately', 'Implement recommended fixes'] : ['Security audit passed'],
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async generateADR(args: { title: string; context?: string; decision?: string }) {
    const { title, context = '', decision = '' } = args;

    const adrTemplate = `# ${title}

## Status
Proposed | Accepted | Deprecated

## Context
${context}

## Decision
${decision}

## Consequences
### Positive
-

### Negative
-

### Neutral
-

## Alternatives Considered
1. 

## Notes
- Generated by Political Sphere MCP Server
- Date: ${new Date().toISOString().split('T')[0]}
`;

    return {
      content: [
        {
          type: 'text',
          text: adrTemplate,
        },
      ],
    };
  }

  private async checkDependencies(args: { packageJson: string }) {
    const { packageJson } = args;

    try {
      const pkg = JSON.parse(packageJson);
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check for known vulnerable packages (simplified check)
      const vulnerablePackages = ['old-package', 'deprecated-lib'];
      const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };

      for (const [name, version] of Object.entries(dependencies)) {
        if (vulnerablePackages.includes(name)) {
          issues.push(`Potentially vulnerable package: ${name}@${version}`);
        }
      }

      // Check for license compatibility
      if (!pkg.license) {
        issues.push('No license specified in package.json');
        recommendations.push('Add appropriate license (e.g., MIT, Apache-2.0)');
      }

      // Check for pinned versions
      for (const [name, version] of Object.entries(dependencies)) {
        if (typeof version === 'string' && version.startsWith('^') && !pkg.name?.includes('template')) {
          recommendations.push(`Consider pinning version for ${name} to avoid breaking changes`);
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                dependencyCheck: issues.length === 0 ? 'PASS' : 'ISSUES_FOUND',
                issues,
                recommendations,
                summary: `${Object.keys(dependencies).length} dependencies analyzed`,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InvalidRequest, `Invalid package.json: ${error}`);
    }
  }

  async handleListResources() {
    return {
      resources: [
        {
          uri: 'political-sphere://governance-rules',
          name: 'Governance Rules',
          description: 'Political Sphere governance and compliance rules',
          mimeType: 'application/json',
        },
        {
          uri: 'political-sphere://security-standards',
          name: 'Security Standards',
          description: 'Security standards and best practices',
          mimeType: 'application/json',
        },
      ],
    };
  }

  async handleReadResource(request: any) {
    const { uri } = request.params;

    switch (uri) {
      case 'political-sphere://governance-rules':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  democraticPrinciples: ['Transparency', 'Accountability', 'Fairness'],
                  constitutionalCompliance: 'Required for all political content',
                  neutrality: 'AI systems must maintain political neutrality',
                  lastUpdated: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };

      case 'political-sphere://security-standards':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  zeroTrust: 'Always verify, never trust',
                  encryption: 'AES-256 minimum for data at rest',
                  secrets: 'Never commit secrets to code',
                  auditability: 'All actions must be traceable',
                  lastUpdated: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };

      default:
        throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    }
  }
}

async function main() {
  const server = new PoliticalSphereMCPServer();
  const transport = new StdioServerTransport();
  await (server as any).connect(transport);
  console.error('Political Sphere Custom MCP server running...');
}

main().catch(console.error);
