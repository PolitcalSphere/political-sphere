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
import puppeteer, { Browser, Page } from 'puppeteer';

class PuppeteerMCPServer extends Server {
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor() {
    super({
      name: 'political-sphere-puppeteer',
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
          name: 'launch_browser',
          description: 'Launch a headless browser instance',
          inputSchema: {
            type: 'object',
            properties: {
              headless: {
                type: 'boolean',
                description: 'Whether to run browser in headless mode',
                default: true,
              },
            },
          },
        },
        {
          name: 'navigate_to',
          description: 'Navigate to a URL',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to navigate to',
              },
              waitUntil: {
                type: 'string',
                enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
                description: 'When to consider navigation complete',
                default: 'networkidle0',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'get_page_content',
          description: 'Get the HTML content of the current page',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'Optional CSS selector to get content from specific element',
              },
            },
          },
        },
        {
          name: 'take_screenshot',
          description: 'Take a screenshot of the current page or element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'Optional CSS selector to screenshot specific element',
              },
              fullPage: {
                type: 'boolean',
                description: 'Whether to take full page screenshot',
                default: true,
              },
            },
          },
        },
        {
          name: 'click_element',
          description: 'Click on an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector of element to click',
              },
              waitForNavigation: {
                type: 'boolean',
                description: 'Whether to wait for navigation after click',
                default: false,
              },
            },
            required: ['selector'],
          },
        },
        {
          name: 'type_text',
          description: 'Type text into an input field',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector of input element',
              },
              text: {
                type: 'string',
                description: 'Text to type',
              },
              clear: {
                type: 'boolean',
                description: 'Whether to clear field before typing',
                default: true,
              },
            },
            required: ['selector', 'text'],
          },
        },
        {
          name: 'wait_for_element',
          description: 'Wait for an element to appear',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector to wait for',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds',
                default: 30000,
              },
            },
            required: ['selector'],
          },
        },
        {
          name: 'close_browser',
          description: 'Close the browser instance',
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
      case 'launch_browser':
        return await this.launchBrowser(typedArgs as { headless?: boolean });
      case 'navigate_to':
        return await this.navigateTo(typedArgs as { url: string; waitUntil?: string });
      case 'get_page_content':
        return await this.getPageContent(typedArgs as { selector?: string });
      case 'take_screenshot':
        return await this.takeScreenshot(typedArgs as { selector?: string; fullPage?: boolean });
      case 'click_element':
        return await this.clickElement(typedArgs as { selector: string; waitForNavigation?: boolean });
      case 'type_text':
        return await this.typeText(typedArgs as { selector: string; text: string; clear?: boolean });
      case 'wait_for_element':
        return await this.waitForElement(typedArgs as { selector: string; timeout?: number });
      case 'close_browser':
        return await this.closeBrowser();
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  }

  private async launchBrowser(args: { headless?: boolean }) {
    try {
      if (this.browser) {
        await this.browser.close();
      }

      this.browser = await puppeteer.launch({
        headless: args.headless !== false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process', // <- this one doesn't work in Windows
          '--disable-gpu'
        ]
      });

      this.page = await this.browser.newPage();

      // Set reasonable timeouts and viewport
      await this.page.setDefaultTimeout(30000);
      await this.page.setViewport({ width: 1280, height: 720 });

      return {
        content: [{ type: 'text', text: 'Browser launched successfully' }],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to launch browser: ${error.message}`
      );
    }
  }

  private async navigateTo(args: { url: string; waitUntil?: string }) {
    if (!this.page) {
      throw new McpError(ErrorCode.InvalidRequest, 'Browser not launched');
    }

    try {
      // Basic URL validation
      const url = new URL(args.url);

      // Allow only http/https for security
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new McpError(ErrorCode.InvalidRequest, 'Only HTTP/HTTPS URLs are allowed');
      }

      await this.page.goto(args.url, {
        waitUntil: (args.waitUntil as any) || 'networkidle0',
        timeout: 30000,
      });

      const title = await this.page.title();
      const url_final = this.page.url();

      return {
        content: [{
          type: 'text',
          text: `Navigated to: ${url_final}\nTitle: ${title}`
        }],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to navigate: ${error.message}`
      );
    }
  }

  private async getPageContent(args: { selector?: string }) {
    if (!this.page) {
      throw new McpError(ErrorCode.InvalidRequest, 'Browser not launched');
    }

    try {
      let content: string;

      if (args.selector) {
        const element = await this.page.$(args.selector);
        if (!element) {
          throw new McpError(ErrorCode.InvalidRequest, `Element not found: ${args.selector}`);
        }
        content = await this.page.evaluate(el => el.textContent || el.innerHTML, element);
      } else {
        content = await this.page.content();
      }

      // Limit content length for safety
      if (content.length > 50000) {
        content = content.substring(0, 50000) + '\n\n[Content truncated for length]';
      }

      return {
        content: [{ type: 'text', text: content }],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get page content: ${error.message}`
      );
    }
  }

  private async takeScreenshot(args: { selector?: string; fullPage?: boolean }) {
    if (!this.page) {
      throw new McpError(ErrorCode.InvalidRequest, 'Browser not launched');
    }

    try {
      let screenshot: Buffer;

      if (args.selector) {
        const element = await this.page.$(args.selector);
        if (!element) {
          throw new McpError(ErrorCode.InvalidRequest, `Element not found: ${args.selector}`);
        }
        screenshot = await element.screenshot() as Buffer;
      } else {
        screenshot = await this.page.screenshot({
          fullPage: args.fullPage !== false,
        }) as Buffer;
      }

      // Convert to base64 for text response
      const base64Image = screenshot.toString('base64');

      return {
        content: [{
          type: 'text',
          text: `Screenshot taken (${screenshot.length} bytes)\nData: data:image/png;base64,${base64Image}`
        }],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to take screenshot: ${error.message}`
      );
    }
  }

  private async clickElement(args: { selector: string; waitForNavigation?: boolean }) {
    if (!this.page) {
      throw new McpError(ErrorCode.InvalidRequest, 'Browser not launched');
    }

    try {
      const element = await this.page.$(args.selector);
      if (!element) {
        throw new McpError(ErrorCode.InvalidRequest, `Element not found: ${args.selector}`);
      }

      if (args.waitForNavigation) {
        await Promise.all([
          this.page.waitForNavigation({ timeout: 30000 }),
          element.click()
        ]);
      } else {
        await element.click();
      }

      return {
        content: [{ type: 'text', text: `Clicked element: ${args.selector}` }],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to click element: ${error.message}`
      );
    }
  }

  private async typeText(args: { selector: string; text: string; clear?: boolean }) {
    if (!this.page) {
      throw new McpError(ErrorCode.InvalidRequest, 'Browser not launched');
    }

    try {
      const element = await this.page.$(args.selector);
      if (!element) {
        throw new McpError(ErrorCode.InvalidRequest, `Element not found: ${args.selector}`);
      }

      if (args.clear !== false) {
        await element.click({ clickCount: 3 }); // Select all text
        await this.page.keyboard.press('Backspace'); // Clear the field
      }

      await element.type(args.text);

      return {
        content: [{ type: 'text', text: `Typed text into: ${args.selector}` }],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to type text: ${error.message}`
      );
    }
  }

  private async waitForElement(args: { selector: string; timeout?: number }) {
    if (!this.page) {
      throw new McpError(ErrorCode.InvalidRequest, 'Browser not launched');
    }

    try {
      await this.page.waitForSelector(args.selector, {
        timeout: args.timeout || 30000,
      });

      return {
        content: [{ type: 'text', text: `Element found: ${args.selector}` }],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Element not found within timeout: ${error.message}`
      );
    }
  }

  private async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;

      return {
        content: [{ type: 'text', text: 'Browser closed' }],
      };
    } else {
      return {
        content: [{ type: 'text', text: 'No browser to close' }],
      };
    }
  }

  async handleListResources() {
    const resources = [];

    if (this.page) {
      resources.push({
        uri: 'web://current-page',
        name: 'Current Page Info',
        description: 'Information about the currently loaded page',
        mimeType: 'application/json',
      });
    }

    return { resources };
  }

  async handleReadResource(request: any) {
    const { uri } = request.params;

    if (uri === 'web://current-page' && this.page) {
      const info = {
        url: this.page.url(),
        title: await this.page.title().catch(() => 'Unknown'),
        viewport: await this.page.viewport(),
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
}

async function main() {
  const server = new PuppeteerMCPServer();
  const transport = new StdioServerTransport();
  await (server as any).connect(transport);
  console.error('Political Sphere Puppeteer MCP server running...');
}

main().catch(console.error);
