import { trace, SpanStatusCode } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
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
  instruments?: any[];
  endpoint?: string;
  headers?: Record<string, string>;
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
  private endpoint: string;
  private headers: Record<string, string> = {};

  // Static registry to track all instances for cleanup
  private static instances = new Set<TracingResource>();
  private static cleanupRegistered = false;

  constructor(client: any) {
    this.client = client;
    this.endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:8082/api/v1/traces';
    
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
   * This is similar to Python's atexit.register(self._cleanup)
   */
  private static registerCleanupHandlers(): void {
    const cleanupAllInstances = () => {
      // Cleanup all TracingResource instances
      for (const instance of TracingResource.instances) {
        try {
          instance._cleanup();
        } catch (error) {
          console.error('Error during tracing cleanup:', error);
        }
      }
      TracingResource.instances.clear();
    };

    // Register cleanup for various exit scenarios
    process.on('SIGINT', cleanupAllInstances);     // Ctrl+C
    process.on('SIGTERM', cleanupAllInstances);    // Termination signal
    process.on('exit', cleanupAllInstances);       // Normal exit
    process.on('beforeExit', cleanupAllInstances); // Before exit
    
    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      cleanupAllInstances();
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      cleanupAllInstances();
      process.exit(1);
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

  // Keep configure for backward compatibility
  configure(config: TracingConfig): void {
    // Convert appName to app_name if needed for backward compatibility
    const normalizedConfig = {
      ...config,
      app_name: (config as any).appName || config.app_name,
    };
    this.init(normalizedConfig);
  }

  private setupTracer(): void {
    if (this.isConfigured || !this.appName || !this.environment) {
      return;
    }

    try {
      // Setup default headers
      const defaultHeaders = {
        'Authorization': `Bearer ${this.client.apiKey}`,
        'Content-Type': 'application/x-protobuf',
        ...this.headers,
      };

      // Parse additional headers from environment
      if (process.env.OTEL_EXPORTER_OTLP_HEADERS) {
        try {
          const envHeaders = JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS);
          if (typeof envHeaders === 'object' && envHeaders !== null) {
            Object.assign(defaultHeaders, envHeaders);
          }
        } catch (error) {
          console.warn('Failed to parse OTEL_EXPORTER_OTLP_HEADERS, using default headers');
        }
      }

      // Create OTLP exporter
      const traceExporter = new OTLPTraceExporter({
        url: this.endpoint,
        headers: defaultHeaders,
        timeoutMillis: 10000, // 10 second timeout
        keepAlive: true,
        httpAgentOptions: {
          keepAlive: true,
          keepAliveMsecs: 30000,
        },
      });

      // Create resource with app-specific attributes
      const resource = resourceFromAttributes({
        [QuotientAttributes.APP_NAME]: this.appName,
        [QuotientAttributes.ENVIRONMENT]: this.environment,
      });

      // Initialize SDK with proper configuration including instruments
      this.sdk = new NodeSDK({
        resource,
        spanProcessor: new BatchSpanProcessor(traceExporter),
        instrumentations: this.instruments,
      });

      // Start the SDK
      this.sdk.start();
      
      // Get tracer
      this.tracer = trace.getTracer('quotient-tracer', '1.0.0');
      this.isConfigured = true;

      console.log(`Tracing initialized successfully for app: ${this.appName}, environment: ${this.environment}, endpoint: ${this.endpoint}`);

    } catch (error) {
      console.error('Failed to setup tracing:', error);
      logError(new Error(`Failed to setup tracing: ${error}`));
      this.tracer = null;
    }
  }

  /**
   * Decorator to trace function calls for Quotient.
   * 
   * The TracingResource must be pre-configured via the init() method
   * before using this decorator.
   * 
   * Example:
   *   quotient.tracer.init({ app_name: "my_app", environment: "prod" });
   *   
   *   class MyClass {
   *     @quotient.trace()
   *     myMethod() {
   *       // method implementation
   *     }
   *   }
   */
  trace() {
    // Use only configured values - no parameters accepted
    if (!this.appName || !this.environment) {
      logError(new Error('tracer must be configured with valid inputs before using trace(). Double check your inputs and try again.'));
      return (target: any, context?: any): any => {
        return target;
      };
    }

    const tracingResource = this;

    // Return a decorator function that handles both legacy and modern decorator signatures
    return (target: any, context?: any): any => {
      // Handle modern decorator context (TypeScript 5.0+)
      if (context && typeof context === 'object' && 'kind' in context) {
        const spanName = `${target.constructor?.name || 'Unknown'}.${String(context.name)}`;

        return function (this: any, ...args: any[]) {
          // Setup tracer if not already done
          if (!tracingResource.isConfigured) {
            tracingResource.setupTracer();
          }

          // If no tracer available, run function normally
          if (!tracingResource.tracer) {
            return target.apply(this, args);
          }

          return tracingResource.tracer.startActiveSpan(spanName, async (span: any) => {
            try {
              // Set span attributes
              span.setAttributes({
                [QuotientAttributes.APP_NAME]: tracingResource.appName,
                [QuotientAttributes.ENVIRONMENT]: tracingResource.environment,
              });
              
              const result = target.apply(this, args);
              
              // Check if result is a Promise
              if (result && typeof result.then === 'function') {
                const awaitedResult = await result;
                span.setStatus({ code: SpanStatusCode.OK });
                return awaitedResult;
              } else {
                span.setStatus({ code: SpanStatusCode.OK });
                return result;
              }
            } catch (error) {
              span.setStatus({ 
                code: SpanStatusCode.ERROR, 
                message: error instanceof Error ? error.message : 'Unknown error' 
              });
              span.recordException(error as Error);
              throw error;
            } finally {
              span.end();
            }
          });
        };
      }

      // Handle legacy decorators - check if we have propertyKey and descriptor
      const propertyKey = context;
      const descriptor = arguments[2] as PropertyDescriptor | undefined;

      // Handle function decorators (when used on standalone functions)
      if (!propertyKey && !descriptor) {
        const originalFunction = target;
        const spanName = originalFunction.name || 'anonymous-function';

        const wrappedFunction = function (this: any, ...args: any[]) {
          // Setup tracer if not already done
          if (!tracingResource.isConfigured) {
            tracingResource.setupTracer();
          }

          // If no tracer available, run function normally
          if (!tracingResource.tracer) {
            return originalFunction.apply(this, args);
          }

          return tracingResource.tracer.startActiveSpan(spanName, async (span: any) => {
            try {
              // Set span attributes
              span.setAttributes({
                [QuotientAttributes.APP_NAME]: tracingResource.appName,
                [QuotientAttributes.ENVIRONMENT]: tracingResource.environment,
              });
              
              const result = originalFunction.apply(this, args);
              
              // Check if result is a Promise
              if (result && typeof result.then === 'function') {
                const awaitedResult = await result;
                span.setStatus({ code: SpanStatusCode.OK });
                return awaitedResult;
              } else {
                span.setStatus({ code: SpanStatusCode.OK });
                return result;
              }
            } catch (error) {
              span.setStatus({ 
                code: SpanStatusCode.ERROR, 
                message: error instanceof Error ? error.message : 'Unknown error' 
              });
              span.recordException(error as Error);
              throw error;
            } finally {
              span.end();
            }
          });
        };

        // Copy properties from original function
        Object.setPrototypeOf(wrappedFunction, originalFunction);
        Object.defineProperty(wrappedFunction, 'name', { value: originalFunction.name });
        
        return wrappedFunction;
      }

      // Handle legacy method decorators (when used on class methods)
      if (!descriptor) {
        return target;
      }

      const originalMethod = descriptor.value;
      const spanName = `${target.constructor.name}.${String(propertyKey)}`;

      descriptor.value = function (this: any, ...args: any[]) {
        // Setup tracer if not already done
        if (!tracingResource.isConfigured) {
          tracingResource.setupTracer();
        }

        // If no tracer available, run function normally
        if (!tracingResource.tracer) {
          return originalMethod.apply(this, args);
        }

        return tracingResource.tracer.startActiveSpan(spanName, async (span: any) => {
          try {
            // Set span attributes
            span.setAttributes({
              [QuotientAttributes.APP_NAME]: tracingResource.appName,
              [QuotientAttributes.ENVIRONMENT]: tracingResource.environment,
            });
            
            const result = originalMethod.apply(this, args);
            
            // Check if result is a Promise
            if (result && typeof result.then === 'function') {
              const awaitedResult = await result;
              span.setStatus({ code: SpanStatusCode.OK });
              return awaitedResult;
            } else {
              span.setStatus({ code: SpanStatusCode.OK });
              return result;
            }
          } catch (error) {
            span.setStatus({ 
              code: SpanStatusCode.ERROR, 
              message: error instanceof Error ? error.message : 'Unknown error' 
            });
            span.recordException(error as Error);
            throw error;
          } finally {
            span.end();
          }
        });
      };

      return descriptor;
    };
  }

  /**
   * Manual span creation for more control
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
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
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
    // Remove from instances registry
    TracingResource.instances.delete(this);
  }

  /**
   * Check if tracing is configured and available
   */
  isTracingEnabled(): boolean {
    return this.isConfigured && this.tracer !== null;
  }

  /**
   * Get current configuration
   */
  getConfig(): { appName: string | null; environment: string | null } {
    return {
      appName: this.appName,
      environment: this.environment,
    };
  }
} 