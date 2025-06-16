import { BaseQuotientClient } from './client';
import { QuotientLogger } from './logger';
import { AuthResource } from './resources/auth';
import { LogsResource, Log } from './resources/logs';
import { TracingResource, QuotientAttributes, TracingConfig } from './tracing';
import { ValidationError, QuotientAIError, logError } from './exceptions';

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
          'If you do not have an API key, you can create one at https://app.quotientai.co in your settings page'
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

}

// Export types and classes
export { BaseQuotientClient } from './client';
export { QuotientLogger } from './logger';
export { AuthResource } from './resources/auth';
export { LogsResource, Log } from './resources/logs';
export { TracingResource, QuotientAttributes, TracingConfig } from './tracing';
export { ValidationError, QuotientAIError, logError } from './exceptions';
export * from './types';
