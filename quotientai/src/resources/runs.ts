import { BaseQuotientClient } from '../client';
import { Dataset, Model, Prompt, Run, RunResult } from '../types';
import { Resource } from './base';

interface RunResponse {
  id: string;
  prompt: string;
  dataset: string;
  model: string;
  parameters: Record<string, any>;
  metrics: string[];
  status: string;
  results: RunResult[];
  created_at: string;
  finished_at: string;
}

export class RunsResource extends Resource {
  constructor(client: BaseQuotientClient) {
    super(client);
  }

  async list(): Promise<Run[]> {
    const response = await this.client.get('/runs');
    return response.map((run: RunResponse) => ({
      ...run,
      created_at: new Date(run.created_at),
      finished_at: run.finished_at ? new Date(run.finished_at) : undefined
    }));
  }

  async getRun(run_id: string): Promise<Run> {
    const response = await this.client.get(`/runs/${run_id}`);
    return {
      ...response,
      created_at: new Date(response.created_at),
      finished_at: response.finished_at ? new Date(response.finished_at) : undefined
    };
  }

  async create(prompt: Prompt, dataset: Dataset, model: Model, parameters: Record<string, any>, metrics: string[]): Promise<Run> {
    const response = await this.client.post('/runs', {
      prompt_id: prompt.id,
      dataset_id: dataset.id,
      model_id: model.id,
      parameters,
      metrics
    });
    return {
      ...response,
      created_at: new Date(response.created_at),
      finished_at: response.finished_at ? new Date(response.finished_at) : undefined
    };
  }

  async compare(runs: Run[]): Promise<Record<string, any>> {
    const response = await this.client.post('/runs/compare', {
      runs: runs.map(run => ({
        id: run.id,
        prompt: run.prompt,
        dataset: run.dataset,
        model: run.model,
        parameters: run.parameters,
        metrics: run.metrics
      }))
    });
    return response;
  }
}

export class Run extends Resource {
