/**
 * Scheduled Imports Job
 * 
 * Runs scheduled data import tasks from various sources at configured intervals.
 * Handles incremental imports and error recovery.
 * 
 * @module jobs/scheduled-imports
 */

import type { ExternalSourcesConnector } from '../connectors/external-sources.js';
import type { DatabaseConnector } from '../connectors/database-connector.js';

export interface ImportJobConfig {
  name: string;
  source: string;
  schedule: string; // Cron expression
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export class ScheduledImportsJob {
  private jobs: Map<string, ImportJobConfig> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly externalSources: ExternalSourcesConnector,
    private readonly database: DatabaseConnector
  ) {}

  /**
   * Register a scheduled import job
   */
  registerJob(config: ImportJobConfig): void {
    this.jobs.set(config.name, config);
    
    if (config.enabled) {
      this.scheduleJob(config.name);
    }
  }

  /**
   * Schedule a job to run at intervals
   */
  private scheduleJob(jobName: string): void {
    const job = this.jobs.get(jobName);
    if (!job) return;

    // TODO: Implement proper cron parsing
    // For now, use simple interval
    const intervalMs = 60000 * 60; // 1 hour
    
    const timer = setInterval(async () => {
      await this.runJob(jobName);
    }, intervalMs);

    this.timers.set(jobName, timer);
  }

  /**
   * Execute an import job
   */
  async runJob(jobName: string): Promise<void> {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job not found: ${jobName}`);
    }

    console.log('Running scheduled import job:', jobName);
    
    try {
      job.lastRun = new Date();
      
      // Fetch data from external source
      const data = await this.externalSources.fetch(job.source);
      
      // Import into database
      await this.database.query(
        'INSERT INTO imports (job_name, source, data, imported_at) VALUES ($1, $2, $3, $4)',
        [job.name, job.source, JSON.stringify(data), new Date()]
      );
      
      console.log('Import job completed:', jobName);
    } catch (error) {
      console.error('Import job failed:', jobName, error);
      throw error;
    }
  }

  /**
   * Start all enabled jobs
   */
  startAll(): void {
    for (const [name, job] of this.jobs.entries()) {
      if (job.enabled) {
        this.scheduleJob(name);
      }
    }
  }

  /**
   * Stop all running jobs
   */
  stopAll(): void {
    for (const [name, timer] of this.timers.entries()) {
      clearInterval(timer);
      console.log('Stopped job:', name);
    }
    this.timers.clear();
  }

  /**
   * Stop a specific job
   */
  stopJob(jobName: string): void {
    const timer = this.timers.get(jobName);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(jobName);
    }
  }

  /**
   * Get all registered jobs
   */
  getJobs(): ImportJobConfig[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get job status
   */
  getJobStatus(jobName: string): ImportJobConfig | undefined {
    return this.jobs.get(jobName);
  }
}
