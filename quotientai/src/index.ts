import { BaseQuotientClient } from './client';
import { QuotientLogger } from './logger';
import { Prompt, Model, Dataset } from './types';
import { Run } from './resources/runs';

export class QuotientAI {
  public auth: any; // Replace with proper AuthResource type
  public prompts: any; // Replace with proper PromptsResource type
  public datasets: any; // Replace with proper DatasetsResource type
  public models: any; // Replace with proper ModelsResource type
  public runs: any; // Replace with proper RunsResource type
  public metrics: any; // Replace with proper MetricsResource type
  public logs: any; // Replace with proper LogsResource type
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
    this.auth = new (require('./resources/auth').AuthResource)(client);
    this.prompts = new (require('./resources/prompts').PromptsResource)(client);
    this.datasets = new (require('./resources/datasets').DatasetsResource)(client);
    this.models = new (require('./resources/models').ModelsResource)(client);
    this.runs = new (require('./resources/runs').RunsResource)(client);
    this.metrics = new (require('./resources/metrics').MetricsResource)(client);
    this.logs = new (require('./resources/logs').LogsResource)(client);

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
  }): Promise<Run> {
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

    return this.runs.create({
      prompt,
      dataset,
      model,
      parameters,
      metrics,
    });
  }
} 