import dbConnection from './database-connection.mjs';
import logger from './logger.js';

const getConnection = () => dbConnection.getConnection();

/**
 * Database Performance Monitor
 * Tracks query performance, slow queries, and provides optimization recommendations
 * @see docs/architecture/decisions/adr-0005-database-performance-monitoring.md
 */

class DatabasePerformanceMonitor {
  constructor(options = {}) {
    this.slowQueryThreshold = options.slowQueryThreshold || 1000; // 1 second
    this.maxQueriesToTrack = options.maxQueriesToTrack || 1000;
    this.enableDetailedLogging = options.enableDetailedLogging || false;

    this.queryStats = new Map();
    this.slowQueries = [];
    this.isEnabled = false;
  }

  /**
   * Enable performance monitoring
   */
  enable() {
    this.isEnabled = true;
    logger.info('Database performance monitoring enabled', {
      slowQueryThreshold: this.slowQueryThreshold,
      maxQueriesToTrack: this.maxQueriesToTrack,
    });
  }

  /**
   * Disable performance monitoring
   */
  disable() {
    this.isEnabled = false;
    logger.info('Database performance monitoring disabled');
  }

  /**
   * Track a query execution
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @param {number} duration - Execution duration in milliseconds
   * @param {Object} metadata - Additional metadata
   */
  trackQuery(sql, params = [], duration = 0, metadata = {}) {
    if (!this.isEnabled) return;

    const queryKey = this.normalizeQuery(sql);
    const isSlow = duration > this.slowQueryThreshold;

    // Update query statistics
    const stats = this.queryStats.get(queryKey) || {
      query: sql,
      normalizedQuery: queryKey,
      callCount: 0,
      totalDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      avgDuration: 0,
      lastExecuted: null,
      slowCallCount: 0,
    };

    stats.callCount++;
    stats.totalDuration += duration;
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.avgDuration = stats.totalDuration / stats.callCount;
    stats.lastExecuted = new Date();

    if (isSlow) {
      stats.slowCallCount++;
    }

    this.queryStats.set(queryKey, stats);

    // Track slow queries
    if (isSlow) {
      this.slowQueries.push({
        sql,
        params,
        duration,
        timestamp: new Date(),
        metadata,
      });

      // Keep only recent slow queries
      if (this.slowQueries.length > 100) {
        this.slowQueries.shift();
      }

      logger.warn('Slow query detected', {
        duration,
        threshold: this.slowQueryThreshold,
        query: this.enableDetailedLogging ? sql : queryKey,
      });
    }

    // Maintain size limit
    if (this.queryStats.size > this.maxQueriesToTrack) {
      // Remove oldest entries (simple LRU approximation)
      const entries = Array.from(this.queryStats.entries());
      entries.sort((a, b) => (a[1].lastExecuted || 0) - (b[1].lastExecuted || 0));
      const toRemove = entries.slice(0, Math.floor(this.maxQueriesToTrack * 0.1));

      for (const [key] of toRemove) {
        this.queryStats.delete(key);
      }
    }
  }

  /**
   * Get database performance statistics
   * @returns {Object} Performance statistics
   */
  getStats() {
    const stats = {
      enabled: this.isEnabled,
      totalQueries: 0,
      totalDuration: 0,
      slowQueriesCount: this.slowQueries.length,
      uniqueQueries: this.queryStats.size,
      topSlowQueries: [],
      performanceSummary: {},
    };

    // Aggregate statistics
    for (const queryStats of this.queryStats.values()) {
      stats.totalQueries += queryStats.callCount;
      stats.totalDuration += queryStats.totalDuration;
    }

    // Get top slow queries
    const sortedQueries = Array.from(this.queryStats.values())
      .filter(q => q.slowCallCount > 0)
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    stats.topSlowQueries = sortedQueries.map(q => ({
      query: this.enableDetailedLogging ? q.query : q.normalizedQuery,
      callCount: q.callCount,
      slowCallCount: q.slowCallCount,
      avgDuration: Math.round(q.avgDuration),
      maxDuration: q.maxDuration,
    }));

    // Performance summary
    stats.performanceSummary = {
      avgQueryDuration: stats.totalQueries > 0 ? stats.totalDuration / stats.totalQueries : 0,
      slowQueryPercentage:
        stats.totalQueries > 0 ? (this.slowQueries.length / stats.totalQueries) * 100 : 0,
      mostFrequentQuery: this.getMostFrequentQuery(),
      longestRunningQuery: this.getLongestRunningQuery(),
    };

    return stats;
  }

  /**
   * Get database health metrics
   * @returns {Promise<Object>} Database health metrics
   */
  async getHealthMetrics() {
    const metrics = {
      timestamp: new Date(),
      database: {},
      indexes: {},
      cache: {},
      recommendations: [],
    };

    try {
      const connection = await getConnection();

      // Database size and page statistics
      const dbStats = connection.db.prepare('PRAGMA page_count').get();
      const pageSize = connection.db.prepare('PRAGMA page_size').get();
      const freelist = connection.db.prepare('PRAGMA freelist_count').get();

      metrics.database = {
        pageCount: dbStats.page_count,
        pageSize: pageSize.page_size,
        totalSize: dbStats.page_count * pageSize.page_size,
        freePages: freelist.freelist_count,
        usedPages: dbStats.page_count - freelist.freelist_count,
      };

      // Index statistics
      const indexes = connection.db
        .prepare(
          `
				SELECT name, tbl_name, sql
				FROM sqlite_master
				WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
			`
        )
        .all();

      for (const index of indexes) {
        try {
          const stat = connection.db.prepare(`PRAGMA index_info(${index.name})`).all();
          metrics.indexes[index.name] = {
            table: index.tbl_name,
            columns: stat.map(s => s.name),
            rowCount: stat.length,
          };
        } catch (error) {
          logger.warn('Failed to get index info', {
            index: index.name,
            error: error.message,
          });
        }
      }

      // Cache statistics
      const cacheStats = connection.db.prepare('PRAGMA cache_size').get();
      metrics.cache = {
        cacheSize: cacheStats.cache_size,
        cacheUsed: connection.db.prepare('PRAGMA cache_used').get()?.cache_used || 0,
      };

      // Generate recommendations
      metrics.recommendations = this.generateRecommendations(metrics);
    } catch (error) {
      logger.error('Failed to collect health metrics', {
        error: error.message,
      });
      metrics.error = error.message;
    }

    return metrics;
  }

  /**
   * Generate optimization recommendations
   * @param {Object} metrics - Health metrics
   * @returns {Array<string>} Recommendations
   */
  generateRecommendations(metrics) {
    const recommendations = [];

    // Database size recommendations
    if (metrics.database.totalSize > 100 * 1024 * 1024) {
      // 100MB
      recommendations.push(
        'Consider database size optimization - current size: ' +
          (metrics.database.totalSize / (1024 * 1024)).toFixed(2) +
          'MB'
      );
    }

    // Index recommendations
    const tableCount = Object.keys(metrics.indexes).length;
    if (tableCount === 0) {
      recommendations.push('Consider adding indexes for frequently queried columns');
    }

    // Cache recommendations
    if (metrics.cache.cacheUsed > metrics.cache.cacheSize * 0.9) {
      recommendations.push('Cache utilization is high - consider increasing cache size');
    }

    // Slow query recommendations
    const slowQueryCount = this.slowQueries.length;
    if (slowQueryCount > 10) {
      recommendations.push(
        `High number of slow queries detected (${slowQueryCount}) - review query optimization`
      );
    }

    return recommendations;
  }

  /**
   * Get most frequent query
   * @returns {Object|null} Most frequent query stats
   */
  getMostFrequentQuery() {
    let mostFrequent = null;
    let maxCalls = 0;

    for (const stats of this.queryStats.values()) {
      if (stats.callCount > maxCalls) {
        maxCalls = stats.callCount;
        mostFrequent = {
          query: this.enableDetailedLogging ? stats.query : stats.normalizedQuery,
          callCount: stats.callCount,
          avgDuration: Math.round(stats.avgDuration),
        };
      }
    }

    return mostFrequent;
  }

  /**
   * Get longest running query
   * @returns {Object|null} Longest running query stats
   */
  getLongestRunningQuery() {
    let longest = null;
    let maxDuration = 0;

    for (const stats of this.queryStats.values()) {
      if (stats.maxDuration > maxDuration) {
        maxDuration = stats.maxDuration;
        longest = {
          query: this.enableDetailedLogging ? stats.query : stats.normalizedQuery,
          maxDuration: stats.maxDuration,
          callCount: stats.callCount,
        };
      }
    }

    return longest;
  }

  /**
   * Normalize SQL query for grouping similar queries
   * @param {string} sql - SQL query
   * @returns {string} Normalized query
   */
  normalizeQuery(sql) {
    if (!sql) return '';

    // Remove extra whitespace and normalize case
    let normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();

    // Replace literal values with placeholders
    normalized = normalized
      .replace(/'[^']*'/g, '?')
      .replace(/"[^"]*"/g, '?')
      .replace(/\b\d+\b/g, '?');

    return normalized;
  }

  /**
   * Reset monitoring data
   */
  reset() {
    this.queryStats.clear();
    this.slowQueries = [];
    logger.info('Performance monitoring data reset');
  }

  /**
   * Export performance data for analysis
   * @returns {Object} Exportable performance data
   */
  exportData() {
    return {
      timestamp: new Date(),
      config: {
        slowQueryThreshold: this.slowQueryThreshold,
        maxQueriesToTrack: this.maxQueriesToTrack,
        enableDetailedLogging: this.enableDetailedLogging,
      },
      stats: this.getStats(),
      slowQueries: this.enableDetailedLogging ? this.slowQueries : [],
      queryStats: Array.from(this.queryStats.values()).map(stats => ({
        ...stats,
        query: this.enableDetailedLogging ? stats.query : stats.normalizedQuery,
      })),
    };
  }
}

// Create singleton instance
const performanceMonitor = new DatabasePerformanceMonitor();

// Auto-enable in development
if (process.env.NODE_ENV === 'development') {
  performanceMonitor.enable();
}

export { DatabasePerformanceMonitor, performanceMonitor };
