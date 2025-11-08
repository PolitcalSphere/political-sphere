/**
 * Common type definitions for data processing pipelines
 * 
 * @module types/pipeline
 */

export interface PipelineConfig {
  name: string;
  batchSize?: number;
  timeout?: number;
  retries?: number;
  parallelism?: number;
}

export interface PipelineResult {
  success: boolean;
  processed: number;
  errors: PipelineError[];
  metadata?: Record<string, unknown>;
}

export interface PipelineError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
}

export interface PipelineMetrics {
  name: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  recordsProcessed: number;
  recordsFailed: number;
  throughput?: number;
}
