/**
 * Data Service Server
 * 
 * Main entry point for the data processing service.
 * Initializes connectors, pipelines, and scheduled jobs.
 * 
 * @module server
 */

import { DatabaseConnector } from './connectors/database-connector.js';
import { ApiConnector } from './connectors/api-connector.js';
import { ExternalSourcesConnector } from './connectors/external-sources.js';
import { UserDataPipeline } from './pipelines/user-data-pipeline.js';
import { AnalyticsPipeline } from './pipelines/analytics-pipeline.js';
import { GameStateSyncPipeline } from './pipelines/game-state-sync.js';
import { ScheduledImportsJob } from './jobs/scheduled-imports.js';
import { DataCleanupJob } from './jobs/data-cleanup.js';
import { ExportReportsJob } from './jobs/export-reports.js';

export class DataServer {
  private database: DatabaseConnector;
  private apiConnector: ApiConnector;
  private externalSources: ExternalSourcesConnector;
  private userPipeline: UserDataPipeline;
  private analyticsPipeline: AnalyticsPipeline;
  private gameStatePipeline: GameStateSyncPipeline;
  private scheduledImports: ScheduledImportsJob;
  private cleanupJob: DataCleanupJob;
  private reportsJob: ExportReportsJob;
  private isRunning = false;

  constructor() {
    // Initialize connectors
    this.database = new DatabaseConnector({
      host: process.env.DB_HOST || 'localhost',
      port: Number.parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'political_sphere',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      poolSize: 10,
    });

    this.apiConnector = new ApiConnector({
      baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
      timeout: 30000,
      retries: 3,
    });

    this.externalSources = new ExternalSourcesConnector();

    // Initialize pipelines
    this.userPipeline = new UserDataPipeline({
      name: 'user-data',
      batchSize: 100,
    });

    this.analyticsPipeline = new AnalyticsPipeline({
      name: 'analytics',
      batchSize: 1000,
    });

    this.gameStatePipeline = new GameStateSyncPipeline({
      name: 'game-state',
      batchSize: 50,
    });

    // Initialize jobs
    this.scheduledImports = new ScheduledImportsJob(
      this.externalSources,
      this.database
    );

    this.cleanupJob = new DataCleanupJob(this.database, {
      retentionDays: 90,
      tables: ['events', 'logs', 'temp_data'],
      archiveEnabled: true,
      archiveDestination: 's3://archives/',
    });

    this.reportsJob = new ExportReportsJob(this.database);
  }

  /**
   * Start the data server
   */
  async start(): Promise<void> {
    console.log('Starting data processing server...');

    try {
      // Connect to database
      await this.database.connect();
      console.log('✓ Database connected');

      // Verify API connectivity
      const apiHealthy = await this.apiConnector.healthCheck();
      console.log(`✓ API connector ${apiHealthy ? 'healthy' : 'unavailable'}`);

      // Register external sources
      this.registerExternalSources();

      // Start scheduled jobs
      this.scheduledImports.startAll();
      console.log('✓ Scheduled import jobs started');

      this.isRunning = true;
      console.log('✓ Data server running');
    } catch (error) {
      console.error('Failed to start data server:', error);
      throw error;
    }
  }

  /**
   * Stop the data server
   */
  async stop(): Promise<void> {
    console.log('Stopping data processing server...');

    this.scheduledImports.stopAll();
    await this.database.disconnect();
    
    this.isRunning = false;
    console.log('✓ Data server stopped');
  }

  /**
   * Register external data sources
   */
  private registerExternalSources(): void {
    // TODO: Load from configuration
    this.externalSources.registerSource({
      name: 'uk-parliament-api',
      type: 'rest',
      url: 'https://api.parliament.uk',
      refreshInterval: 3600000, // 1 hour
    });

    console.log('✓ External sources registered');
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    database: boolean;
    api: boolean;
  }> {
    return {
      status: this.isRunning ? 'healthy' : 'unhealthy',
      database: await this.database.healthCheck(),
      api: await this.apiConnector.healthCheck(),
    };
  }

  /**
   * Get server status
   */
  getStatus(): {
    running: boolean;
    uptime: number;
    pipelines: Record<string, unknown>;
  } {
    return {
      running: this.isRunning,
      uptime: process.uptime(),
      pipelines: {
        user: this.userPipeline,
        analytics: this.analyticsPipeline,
        gameState: this.gameStatePipeline,
      },
    };
  }
}

// Start server if running as main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new DataServer();
  
  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  server.start().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default DataServer;
