import { BaseQuotientClient } from './client';
import { QuotientLogger } from './logger';
import { AuthResource } from './resources/auth';
import { LogsResource } from './resources/logs';
import { TracingResource } from './tracing';
import { logError } from './exceptions';
import { LogEntry, DetectionResults } from './types';

export class QuotientAI {
  public auth: AuthResource = null!;
  public logs: LogsResource = null!;
  public logger: QuotientLogger = null!;
  public tracer: TracingResource = null!;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.QUOTIENT_API_KEY;
    if (!key) {
      const error = new Error(
        'Could not find API key. Either pass apiKey to QuotientAI() or ' +
          'set the QUOTIENT_API_KEY environment variable. ' +
          'If you do not have an API key, you can create one at https://app.quotientai.co in your settings page.'
      );
      logError(error, 'QuotientAI.constructor');
      return;
    } else {
      const client = new BaseQuotientClient(key);
      this.initializeResources(client);
    }
  }

  private initializeResources(client: BaseQuotientClient): void {
    // Initialize resources
    this.auth = new AuthResource(client);
    this.logs = new LogsResource(client);

    // Create an unconfigured logger instance
    this.logger = new QuotientLogger(this.logs as LogsResource);

    // Create tracing resource
    this.tracer = new TracingResource(client);

    // Authenticate
    try {
      this.auth.authenticate();
    } catch (error) {
      logError(
        error as Error,
        'If you are seeing this error, please check that your API key is correct.\n' +
          'If the issue persists, please contact support@quotientai.co'
      );
      return;
    }
  }

  /**
   * Args:
   *     user_query: The user's input query
   *     model_output: The model's response
   *     documents: Optional list of documents (strings or LogDocument objects)
   *     message_history: Optional conversation history
   *     instructions: Optional list of instructions
   *     tags: Optional tags to attach to the log
   *     hallucination_detection: Override hallucination detection setting
   *     inconsistency_detection: Override inconsistency detection setting
   *
   * Returns:
   *     Log ID if successful, None otherwise
   */
  async log(params: Omit<LogEntry, 'appName' | 'environment'>): Promise<any> {
    return this.logger._internalLog(params);
  }

  /**
   * Poll for detection results.
   *
   * Args:
   *     log_id: The ID of the log to get detection results for
   *     timeout: Maximum time to wait for results in seconds (default: 300/5min)
   *     poll_interval: How often to poll the API in seconds (default: 2s)
   *
   * Returns:
   *     Detection results if successful, None otherwise
   */
  async pollForDetections(
    logId: string,
    timeout: number = 300,
    pollInterval: number = 2.0
  ): Promise<DetectionResults | null> {
    return this.logger._internalPollForDetection(logId, timeout, pollInterval);
  }
}

// Export types that users need
export { TracingConfig } from './tracing';
