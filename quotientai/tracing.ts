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
    const cleanupAllInstances = async () => {
      // Force flush all TracingResource instances before cleanup
      const flushPromises = Array.from(TracingResource.instances).map(async (instance) => {
        try {
          if (instance.sdk) {
            await instance.sdk.shutdown();
          }
        } catch (error) {
          console.error('Error during auto-flush');
        }
      });
      // Wait for all flushes to complete
      await Promise.all(flushPromises);
      
      // Clear instances registry
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
      console.error('Uncaught exception:', error);
      cleanupAllInstances().then(() => process.exit(1));
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
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

    this.appName = config.app_name;
    this.environment = config.environment;
    
    // Auto-instrument all supported libraries that are available
    this.instruments = this.createAutoInstruments();
    
    this.endpoint = config.endpoint || this.endpoint;
    this.headers = config.headers || {};
    
    // Initialize tracer with OTLP exporter
    this.setupTracer();
  }

  /**
   * Create instrumentation instances for all supported libraries that are available
   */
  private createAutoInstruments(): any[] {
    const autoInstruments: any[] = [];
    const detectedLibraries: string[] = [];
    
    // Define available instrumentations with their package detection
    const instrumentationConfigs = [
      {
        name: 'OpenAIInstrumentation',
        moduleName: ['openai'],
        packageName: '@arizeai/openinference-instrumentation-openai',
        className: 'OpenAIInstrumentation'
      },
      {
        name: 'LangChainInstrumentation', 
        moduleName: ['langchain', '@langchain/core', '@langchain/openai'],
        packageName: '@arizeai/openinference-instrumentation-langchain',
        className: 'LangChainInstrumentation'
      }
    ];

    for (const lib of instrumentationConfigs) {
      try {
        // Handle both single module names and arrays of module names
        const moduleNames = Array.isArray(lib.moduleName) ? lib.moduleName : [lib.moduleName];
        let targetModule = null;
        let detectedModuleName = '';
        
        // Check if any of the target modules are available
        for (const moduleName of moduleNames) {
          targetModule = this.getModuleExports(moduleName);
          if (targetModule) {
            detectedModuleName = moduleName;
            break;
          }
        }
        
        if (!targetModule) {
          continue; // No target modules found, skip
        }

        // Check if the instrumentation package is available
        const instrumentationModule = this.getModuleExports(lib.packageName);
        if (!instrumentationModule) {
          console.warn(`${lib.name} detected but ${lib.packageName} not installed. Install it for automatic instrumentation.`);
          continue;
        }

        // Create instrumentation instance
        const InstrumentationClass = instrumentationModule[lib.className];
        if (InstrumentationClass) {
          const instrument = new InstrumentationClass();
          autoInstruments.push(instrument);
          detectedLibraries.push(lib.name.replace('Instrumentation', ''));
        } else {
          console.warn(`${lib.className} not found in ${lib.packageName}`);
        }
      } catch (error) {
        console.warn(`Failed to auto-instrument ${lib.name}:`, error);
      }
    }

    // Log which instrumentations were successfully initialized
    if (detectedLibraries.length > 0) {
      console.log(`🔧 Auto-initialized instrumentations: ${detectedLibraries.join(', ')}`);
    } else {
      console.log('ℹ️  No supported libraries detected for auto-instrumentation');
    }

    return autoInstruments;
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
        keepAlive: true,
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
      
      // Handle manual instrumentation for ES modules
      this.handleManualInstrumentation();
      
      // Get tracer
      this.tracer = trace.getTracer('quotient-tracer', '1.0.0');
      this.isConfigured = true;

      console.log(`Tracing initialized successfully for app: ${this.appName}, environment: ${this.environment}, collector endpoint: ${this.endpoint}`);

    } catch (error) {
      console.error('Failed to setup tracing:', error);
      logError(new Error(`Failed to setup tracing: ${error}`));
      this.tracer = null;
    }
  }

  /**
   * Handle manual instrumentation for ES modules where automatic patching doesn't work
   */
  private handleManualInstrumentation(): void {
    for (const instrument of this.instruments) {
      // Check if this instrumentation has a manuallyInstrument method
      if (typeof instrument.manuallyInstrument === 'function') {
        try {
          // Special handling for LangChain - must manually instrument the callbacks manager
          if (instrument.constructor.name === 'LangChainInstrumentation') {
            try {
              // LangChain requires manual instrumentation of the callbacks manager module
              const callbackManagerModule = this.getModuleExports('@langchain/core/callbacks/manager');
              if (callbackManagerModule) {
                instrument.manuallyInstrument(callbackManagerModule);
                console.log('LangChain callbacks manager manually instrumented successfully');
              } else {
                console.warn('LangChain callbacks manager module not found, instrumentation may not work');
              }
            } catch (langchainError) {
              const errorMessage = langchainError instanceof Error ? langchainError.message : String(langchainError);
              console.warn(`LangChain manual instrumentation failed:`, errorMessage);
            }
            continue;
          }
          
          // For other instrumentations, try to determine what module this instrumentation is for
          const targetModule = this.getTargetModuleForInstrumentation(instrument);
          if (targetModule) {
            const moduleName = targetModule.name;
            const moduleExports = this.getModuleExports(moduleName);
            
            if (moduleExports) {
              instrument.manuallyInstrument(moduleExports);
            }
          }
        } catch (error) {
          console.warn(`Failed to manually instrument module for ${instrument.constructor.name}:`, error);
        }
      }
    }
  }

  /**
   * Determine what module an instrumentation is targeting
   */
  private getTargetModuleForInstrumentation(instrument: any): { name: string } | null {
    const instrumentName = instrument.constructor.name;
    
    // Map supported instrumentation class names to their target modules
    const supportedInstrumentations: Record<string, string[]> = {
      'OpenAIInstrumentation': ['openai'],
      'LangChainInstrumentation': ['langchain', '@langchain/core', '@langchain/openai'],
    };

    // Check if this is a supported instrumentation
    if (supportedInstrumentations[instrumentName]) {
      const moduleNames = supportedInstrumentations[instrumentName];
      
      // Try to find which module is actually available
      for (const moduleName of moduleNames) {
        const moduleExports = this.getModuleExports(moduleName);
        if (moduleExports) {
          return { name: moduleName };
        }
      }
    }

    // Log unsupported instrumentations for debugging
    console.warn(`Unsupported instrumentation: ${instrumentName}. Currently supported: OpenAI, LangChain`);
    return null;
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
      // Try direct require (this works in most cases)
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
   * Force flush any pending spans to ensure they are exported
   * NOTE: This is optional - spans are automatically flushed on process exit
   */
  async forceFlush(): Promise<void> {
    if (this.sdk) {
      try {
        await this.sdk.shutdown();
        // Mark as not configured since we shut down the SDK
        this.isConfigured = false;
        this.tracer = null;
      } catch (error) {
        console.error('Error flushing spans:', error);
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