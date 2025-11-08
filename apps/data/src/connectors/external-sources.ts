/**
 * External Sources Connector
 * 
 * Manages connections to external data sources like third-party APIs,
 * data feeds, and webhook endpoints.
 * 
 * @module connectors/external-sources
 */

export interface ExternalSourceConfig {
  name: string;
  type: 'rest' | 'graphql' | 'webhook' | 'feed';
  url: string;
  apiKey?: string;
  refreshInterval?: number;
}

export interface DataFeed<T = unknown> {
  id: string;
  source: string;
  data: T;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export class ExternalSourcesConnector {
  private sources: Map<string, ExternalSourceConfig> = new Map();
  private listeners: Map<string, Set<(data: DataFeed) => void>> = new Map();

  /**
   * Register an external data source
   */
  registerSource(config: ExternalSourceConfig): void {
    this.sources.set(config.name, config);
    console.log('Registered external source:', config.name);
  }

  /**
   * Unregister a data source
   */
  unregisterSource(name: string): void {
    this.sources.delete(name);
    this.listeners.delete(name);
  }

  /**
   * Fetch data from an external source
   */
  async fetch<T = unknown>(sourceName: string): Promise<DataFeed<T>> {
    const source = this.sources.get(sourceName);
    if (!source) {
      throw new Error(`External source not found: ${sourceName}`);
    }

    // TODO: Implement actual data fetching based on source type
    console.log('Fetching from external source:', source);
    
    return {
      id: crypto.randomUUID(),
      source: sourceName,
      data: {} as T,
      timestamp: new Date(),
      metadata: {
        type: source.type,
        url: source.url,
      },
    };
  }

  /**
   * Subscribe to real-time updates from a source
   */
  subscribe(
    sourceName: string,
    callback: (data: DataFeed) => void
  ): () => void {
    if (!this.listeners.has(sourceName)) {
      this.listeners.set(sourceName, new Set());
    }
    
    const callbacks = this.listeners.get(sourceName)!;
    callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
    };
  }

  /**
   * Emit data update to subscribers
   */
  private emit(sourceName: string, data: DataFeed): void {
    const callbacks = this.listeners.get(sourceName);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data);
      }
    }
  }

  /**
   * Start polling a source at regular intervals
   */
  startPolling(sourceName: string): () => void {
    const source = this.sources.get(sourceName);
    if (!source) {
      throw new Error(`External source not found: ${sourceName}`);
    }

    const interval = source.refreshInterval || 60000; // Default 1 minute
    
    const timerId = setInterval(async () => {
      try {
        const data = await this.fetch(sourceName);
        this.emit(sourceName, data);
      } catch (error) {
        console.error('Error polling external source:', sourceName, error);
      }
    }, interval);

    // Return stop function
    return () => {
      clearInterval(timerId);
    };
  }

  /**
   * Validate connection to external source
   */
  async validateConnection(sourceName: string): Promise<boolean> {
    try {
      await this.fetch(sourceName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all registered sources
   */
  getSources(): ExternalSourceConfig[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get source configuration
   */
  getSource(name: string): ExternalSourceConfig | undefined {
    return this.sources.get(name);
  }
}
