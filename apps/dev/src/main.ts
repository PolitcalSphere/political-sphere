/**
 * Development Tools and Experimental Features - Main Entry Point
 *
 * This is the main entry point for the development tools application.
 * It provides access to experiments, prototypes, and development utilities.
 *
 * @module apps/dev
 */

import { createServer } from "node:http";

const PORT = process.env.DEV_PORT || 3001;

/**
 * Development server for hosting experiments and tools
 */
class DevServer {
  private server?: ReturnType<typeof createServer>;

  /**
   * Start the development server
   */
  async start(): Promise<void> {
    console.log("🔧 Starting Development Tools Server...");

    this.server = createServer((req, res) => {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);

      // Route handling for different dev tools
      switch (url.pathname) {
        case "/":
          this.handleIndex(res);
          break;
        case "/experiments":
          this.handleExperiments(res);
          break;
        case "/tools":
          this.handleTools(res);
          break;
        case "/sandbox":
          this.handleSandbox(res);
          break;
        case "/health":
          this.handleHealth(res);
          break;
        default:
          this.handleNotFound(res);
      }
    });

    this.server.listen(PORT, () => {
      console.log(`✓ Development server running at http://localhost:${PORT}`);
      console.log("");
      console.log("Available endpoints:");
      console.log(`  → http://localhost:${PORT}/            - Index`);
      console.log(`  → http://localhost:${PORT}/experiments - Feature experiments`);
      console.log(`  → http://localhost:${PORT}/tools       - Development tools`);
      console.log(`  → http://localhost:${PORT}/sandbox     - Sandbox environment`);
      console.log(`  → http://localhost:${PORT}/health      - Health check`);
    });
  }

  /**
   * Stop the development server
   */
  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server?.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log("✓ Development server stopped");
    }
  }

  /**
   * Handle index page
   */
  private handleIndex(res: import("node:http").ServerResponse): void {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Development Tools - Political Sphere</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.6;
            }
            h1 { color: #2c3e50; }
            .nav { margin: 30px 0; }
            .nav a {
              display: block;
              padding: 10px;
              margin: 5px 0;
              background: #ecf0f1;
              text-decoration: none;
              color: #2c3e50;
              border-radius: 4px;
            }
            .nav a:hover { background: #bdc3c7; }
          </style>
        </head>
        <body>
          <h1>🔧 Development Tools</h1>
          <p>Welcome to the Political Sphere development tools and experimental features.</p>
          <div class="nav">
            <a href="/experiments">📊 Feature Experiments & Prototypes</a>
            <a href="/tools">🛠️ Development Tools & Utilities</a>
            <a href="/sandbox">🧪 Sandbox Environment</a>
            <a href="/health">❤️ Health Check</a>
          </div>
        </body>
      </html>
    `);
  }

  /**
   * Handle experiments page
   */
  private handleExperiments(res: import("node:http").ServerResponse): void {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify(
        {
          message: "Feature experiments and prototypes",
          available: ["feature-prototypes", "ai-playground", "performance-tests"],
        },
        null,
        2,
      ),
    );
  }

  /**
   * Handle tools page
   */
  private handleTools(res: import("node:http").ServerResponse): void {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify(
        {
          message: "Development tools and utilities",
          available: ["data-generators", "mock-servers", "test-harnesses"],
        },
        null,
        2,
      ),
    );
  }

  /**
   * Handle sandbox page
   */
  private handleSandbox(res: import("node:http").ServerResponse): void {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify(
        {
          message: "Sandbox environment for testing",
          available: ["component-demos", "api-exploration", "integration-tests"],
        },
        null,
        2,
      ),
    );
  }

  /**
   * Handle health check
   */
  private handleHealth(res: import("node:http").ServerResponse): void {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify(
        {
          status: "healthy",
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  }

  /**
   * Handle 404 not found
   */
  private handleNotFound(res: import("node:http").ServerResponse): void {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify(
        {
          error: "Not found",
          message: "The requested resource does not exist",
        },
        null,
        2,
      ),
    );
  }
}

// Start server if running as main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new DevServer();

  // Handle graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully...");
    await server.stop();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("SIGINT received, shutting down gracefully...");
    await server.stop();
    process.exit(0);
  });

  server.start().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { DevServer };
export default DevServer;
