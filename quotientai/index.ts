import { BaseQuotientClient } from './client';
import { QuotientLogger } from './logger';
import { Prompt, Model, Dataset } from './types';
import { Run } from './resources/runs';
import { AuthResource } from './resources/auth';
import { PromptsResource } from './resources/prompts';
import { DatasetsResource } from './resources/datasets';
import { ModelsResource } from './resources/models';
import { RunsResource } from './resources/runs';
import { MetricsResource } from './resources/metrics';
import { LogsResource } from './resources/logs';

export class QuotientAI {
  public auth: AuthResource;
  public prompts: PromptsResource;
  public datasets: DatasetsResource;
  public models: ModelsResource;
  public runs: RunsResource;
  public metrics: MetricsResource;
  public logs: LogsResource;
  public logger: QuotientLogger;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.QUOTIENT_API_KEY;
    if (!key) {
      throw new Error(
        'Could not find API key. Either pass apiKey to QuotientAI() or ' +
        'set the QUOTIENT_API_KEY environment variable. ' +
        'If you do not have an API key, you can create one at https://app.quotientai.co in your settings page'
      );
    }

    const client = new BaseQuotientClient(key);
    
    // Initialize resources
    this.auth = new AuthResource(client);
    this.prompts = new PromptsResource(client);
    this.datasets = new DatasetsResource(client);
    this.models = new ModelsResource(client);
    this.runs = new RunsResource(client);
    this.metrics = new MetricsResource(client);
    this.logs = new LogsResource(client);

    // Authenticate
    this.auth.authenticate();

    // Create an unconfigured logger instance
    this.logger = new QuotientLogger(this.logs);
  }

  async evaluate(params: {
    prompt: Prompt;
    dataset: Dataset;
    model: Model;
    parameters: Record<string, any>;
    metrics: string[];
  }): Promise<Omit<Run, 'client'> | null> {
    const { prompt, dataset, model, parameters, metrics } = params;

    // Validate parameters
    const validParameters = ['temperature', 'top_k', 'top_p', 'max_tokens'];
    const invalidParameters = Object.keys(parameters).filter(
      key => !validParameters.includes(key)
    );

    if (invalidParameters.length > 0) {
      throw new Error(
        `Invalid parameters: ${invalidParameters.join(', ')}. ` +
        `Valid parameters are: ${validParameters.join(', ')}`
      );
    }

    return this.runs.create(prompt, dataset, model, parameters, metrics);
  }
} 