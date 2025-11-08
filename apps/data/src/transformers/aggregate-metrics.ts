/**
 * Aggregate Metrics Transformer
 * 
 * Aggregates raw metrics into summary statistics and time-series data
 * for analytics and reporting.
 * 
 * @module transformers/aggregate-metrics
 */

export interface MetricData {
  metric: string;
  value: number;
  timestamp: Date;
  dimensions?: Record<string, string>;
}

export interface AggregatedMetric {
  metric: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  period: {
    start: Date;
    end: Date;
  };
  dimensions?: Record<string, string>;
}

export class AggregateMetricsTransformer {
  /**
   * Aggregate metrics by time period
   */
  aggregateByPeriod(
    metrics: MetricData[],
    periodMs: number
  ): AggregatedMetric[] {
    // TODO: Implement time-based aggregation
    // 1. Group metrics by period
    // 2. Calculate statistics for each group
    // 3. Generate time-series buckets
    
    const grouped = this.groupByPeriod(metrics, periodMs);
    return Array.from(grouped.entries()).map(([_period, data]) => 
      this.calculateStats(data)
    );
  }

  /**
   * Group metrics into time periods
   */
  private groupByPeriod(
    metrics: MetricData[],
    periodMs: number
  ): Map<number, MetricData[]> {
    const grouped = new Map<number, MetricData[]>();
    
    for (const metric of metrics) {
      const periodKey = Math.floor(metric.timestamp.getTime() / periodMs);
      const existing = grouped.get(periodKey) || [];
      existing.push(metric);
      grouped.set(periodKey, existing);
    }
    
    return grouped;
  }

  /**
   * Calculate aggregate statistics
   */
  private calculateStats(metrics: MetricData[]): AggregatedMetric {
    const values = metrics.map(m => m.value);
    const timestamps = metrics.map(m => m.timestamp);
    
    return {
      metric: metrics[0]?.metric || 'unknown',
      count: metrics.length,
      sum: values.reduce((a, b) => a + b, 0),
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      period: {
        start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
        end: new Date(Math.max(...timestamps.map(t => t.getTime()))),
      },
      dimensions: metrics[0]?.dimensions,
    };
  }

  /**
   * Aggregate by custom dimensions
   */
  aggregateByDimension(
    metrics: MetricData[],
    dimension: string
  ): Map<string, AggregatedMetric> {
    const grouped = new Map<string, MetricData[]>();
    
    for (const metric of metrics) {
      const key = metric.dimensions?.[dimension] || 'unknown';
      const existing = grouped.get(key) || [];
      existing.push(metric);
      grouped.set(key, existing);
    }
    
    const result = new Map<string, AggregatedMetric>();
    for (const [key, data] of grouped.entries()) {
      result.set(key, this.calculateStats(data));
    }
    
    return result;
  }
}
