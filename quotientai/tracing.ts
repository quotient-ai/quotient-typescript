import { trace, SpanStatusCode } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { logError } from './exceptions';

export enum QuotientAttributes {
  APP_NAME = 'app.name',
  ENVIRONMENT = 'app.environment',
}

export interface TracingConfig {
  app_name: string;
  environment: string;
  endpoint?: string;
  headers?: Record<string, string>;
  instruments?: any[];
}

export class TracingResource {
  private client: any;
  private sdk: NodeSDK | null = null;
  private tracer: any = null;
  private isConfigured = false;

  // Store configuration for reuse
  private appName: string | null = null;
  private environment: string | null = null;
  private instruments: any[] = [];
  private detectedModules: Map<string, string> = new Map();
  private endpoint: string;
  private headers: Record<string, string> = {};

  // Static registry to track all instances for cleanup
  private static instances = new Set<TracingResource>();
  private static cleanupRegistered = false;

  constructor(client: any) {
    this.client = client;
    this.endpoint =
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://api.quotientai.co/api/v1/traces';

    // Register this instance for cleanup
    TracingResource.instances.add(this);

    // Register cleanup handlers only once (similar to Python's atexit.register)
    if (!TracingResource.cleanupRegistered) {
      TracingResource.registerCleanupHandlers();
      TracingResource.cleanupRegistered = true;
    }
  }

  /**
   * Register cleanup handlers for all process exit scenarios
   */
  private static registerCleanupHandlers(): void {
    const cleanupAllInstances = async () => {
      // Force flush all TracingResource instances before cleanup
      const flushPromises = Array.from(TracingResource.instances).map(async (instance) => {
        try {
          if (instance.sdk) {
            await instance.sdk.shutdown();
          }
        } catch (error) {
          logError(new Error(`Error during auto-flush: ${error}`));
        }
      });
      await Promise.all(flushPromises);

      TracingResource.instances.clear();
    };

    // Register cleanup for various exit scenarios
    process.on('SIGINT', () => {
      cleanupAllInstances().then(() => process.exit(0));
    });

    process.on('SIGTERM', () => {
      cleanupAllInstances().then(() => process.exit(0));
    });

    process.on('beforeExit', () => {
      cleanupAllInstances();
    });

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      logError(new Error(`Uncaught exception: ${error}`));
      cleanupAllInstances().then(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, promise) => {
      logError(new Error(`Unhandled rejection at: ${promise}, reason: ${reason}`));
      cleanupAllInstances().then(() => process.exit(1));
    });
  }

  init(config: TracingConfig): void {
    // Validate inputs
    if (!config.app_name || typeof config.app_name !== 'string') {
      logError(new Error('app_name must be a non-empty string'));
      return;
    }
    if (!config.environment || typeof config.environment !== 'string') {
      logError(new Error('environment must be a non-empty string'));
      return;
    }
    if (config.instruments && !Array.isArray(config.instruments)) {
      logError(new Error('instruments must be an array'));
      return;
    }

    this.appName = config.app_name;
    this.environment = config.environment;
    this.instruments = config.instruments || [];
    this.endpoint = config.endpoint || this.endpoint;
    this.headers = config.headers || {};

    // Initialize tracer with OTLP exporter
    this.setupTracer();
  }

  private setupTracer(): void {
    if (this.isConfigured || !this.appName || !this.environment) {
      return;
    }

    try {
      const defaultHeaders = {
        Authorization: `Bearer ${this.client.apiKey}`,
        // Note: Content-Type header is automatically set by the protobuf exporter
        ...this.headers,
      };

      if (process.env.OTEL_EXPORTER_OTLP_HEADERS) {
        try {
          const envHeaders = JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS);
          if (typeof envHeaders === 'object' && envHeaders !== null) {
            Object.assign(defaultHeaders, envHeaders);
          }
        } catch (error) {
          console.warn('Failed to parse OTEL_EXPORTER_OTLP_HEADERS, using default headers...');
        }
      }

      const traceExporter = new OTLPTraceExporter({
        url: this.endpoint,
        headers: defaultHeaders,
        keepAlive: true,
      });

      const resource = resourceFromAttributes({
        [QuotientAttributes.APP_NAME]: this.appName,
        [QuotientAttributes.ENVIRONMENT]: this.environment,
      });

      this.sdk = new NodeSDK({
        resource,
        spanProcessor: new BatchSpanProcessor(traceExporter),
      });

      // Start the SDK
      this.sdk.start();

      this.handleManualInstrumentation();

      this.tracer = trace.getTracer('quotient-tracer', '0.1.0');
      this.isConfigured = true;

      const instrumentNames = this.instruments.map((i) => i.constructor.name).join(', ');
      console.log(
        `Tracing initialized successfully for app: ${this.appName}, environment: ${this.environment}, collector endpoint: ${this.endpoint}${instrumentNames ? `, instruments: ${instrumentNames}` : ''}`
      );
    } catch (error) {
      logError(new Error(`Failed to setup tracing: ${error}`));
      this.tracer = null;
    }
  }

  /**
   * Always do manual instrumentation instead of auto-instrumentation for better reliability
   */
  private handleManualInstrumentation(): void {
    for (const instrument of this.instruments) {
      // Check if this instrumentation has a manuallyInstrument method
      if (typeof instrument.manuallyInstrument === 'function') {
        try {
          const instrumentName = instrument.constructor.name;

          // Special handling for LangChain - must manually instrument the callbacks manager
          if (instrumentName === 'LangChainInstrumentation') {
            try {
              // LangChain requires manual instrumentation of the callbacks manager module
              const callbackManagerModule = this.getModuleExports(
                '@langchain/core/callbacks/manager'
              );
              if (callbackManagerModule) {
                instrument.manuallyInstrument(callbackManagerModule);
              } else {
                // Silently skip if callbacks manager not found
              }
            } catch (langchainError) {
              // Silently skip if LangChain manual instrumentation fails
            }
            continue;
          }

          // For OpenAI and other instrumentations, manually instrument the main module
          if (instrumentName === 'OpenAIInstrumentation') {
            try {
              const openaiModule = this.getModuleExports('openai');
              if (openaiModule) {
                instrument.manuallyInstrument(openaiModule);
              }
            } catch (openaiError) {
              // Silently skip if OpenAI module not found
            }
            continue;
          }
        } catch (error) {
          // Silently skip if manual instrumentation fails
        }
      }
    }
  }

  /**
   * Attempt to get a module's exports from various sources
   */
  private getModuleExports(moduleName: string): any {
    try {
      // Try to get from require cache first (CommonJS)
      const moduleFromCache = require.cache[require.resolve(moduleName)];
      if (moduleFromCache) {
        return moduleFromCache.exports;
      }
    } catch {
      // Ignore if not found in cache
    }

    try {
      // Try direct require
      return require(moduleName);
    } catch {
      // Ignore if require fails
    }

    try {
      // Try dynamic require with eval (for bundlers that might interfere)
      const moduleExports = eval(`require("${moduleName}")`);
      return moduleExports;
    } catch {
      // Ignore if dynamic require fails
    }

    return null;
  }

  /**
   * Manual span creation
   */
  async startSpan(name: string, callback: (span: any) => Promise<any>): Promise<any> {
    if (!this.isConfigured) {
      this.setupTracer();
    }

    if (!this.tracer) {
      return await callback(null);
    }

    return await this.tracer.startActiveSpan(name, async (span: any) => {
      try {
        // Set span attributes
        span.setAttributes({
          [QuotientAttributes.APP_NAME]: this.appName,
          [QuotientAttributes.ENVIRONMENT]: this.environment,
        });

        const result = await callback(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Force flush any pending spans to ensure they are exported
   * NOTE: spans are automatically flushed on process exit
   */
  async forceFlush(): Promise<void> {
    if (this.sdk) {
      try {
        await this.sdk.shutdown();
        // Mark as not configured since we shut down the SDK
        this.isConfigured = false;
        this.tracer = null;
      } catch (error) {
        logError(new Error(`Error flushing spans: ${error}`));
      }
    }
  }

  /**
   * Internal cleanup method (similar to Python's _cleanup)
   * This is called automatically on process exit via the registered handlers
   */
  private _cleanup(): void {
    if (this.sdk) {
      try {
        this.sdk.shutdown();
        this.sdk = null;
        this.tracer = null;
        this.isConfigured = false;
      } catch (error) {
        logError(new Error(`Failed to cleanup tracing: ${error}`));
      }
    }
  }

  /**
   * Public cleanup method (similar to Python's cleanup method)
   * This can be called manually, but cleanup also happens automatically on exit
   */
  shutdown(): void {
    this._cleanup();
    TracingResource.instances.delete(this);
  }
}
