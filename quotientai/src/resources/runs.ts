import { BaseQuotientClient } from '../client';
import { Dataset, Model, Prompt, RunResult } from '../types';
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
  finished_at: string | null;
}

interface MetricSummary {
  avg: number;
  stddev: number;
}

interface RunSummary {
  id: string;
  model: string;
  parameters: Record<string, any>;
  metrics: Record<string, MetricSummary>;
  created_at: Date;
  best_n?: RunResult[];
  worst_n?: RunResult[];
}

export class Run {
    id: string;
    prompt: string;
    dataset: string;
    model: string;
    parameters: Record<string, any>;
    metrics: string[];
    status: string;
    results: RunResult[];
    created_at: Date;
    finished_at?: Date;

    constructor(private client: BaseQuotientClient, data: RunResponse) {
        this.id = data.id;
        this.prompt = data.prompt;
        this.dataset = data.dataset;
        this.model = data.model;
        this.parameters = data.parameters;
        this.metrics = data.metrics;
        this.status = data.status;
        this.results = data.results;
        this.created_at = new Date(data.created_at);
        this.finished_at = data.finished_at ? new Date(data.finished_at) : undefined;
    }

    summarize(best_n: number = 3, worst_n: number = 3): RunSummary | null {
        if (!this.results || this.results.length === 0) {
            return null;
        }

        // Calculate metrics for each result
        const resultMetrics = this.results.map(result => {
            const avg = this.metrics.reduce((sum, metric) => sum + result.values[metric], 0) / this.metrics.length;
            return { result, avg };
        });

        // Sort results by average metric value
        resultMetrics.sort((a, b) => b.avg - a.avg);

        // Get best and worst results
        const bestResults = best_n > 0 ? resultMetrics.slice(0, best_n).map(r => r.result) : undefined;
        const worstResults = worst_n > 0 ? resultMetrics.slice(-worst_n).map(r => r.result) : undefined;

        // Calculate metrics summary
        const metricsSummary = this.metrics.reduce((acc, metric) => {
            const values = this.results.map(r => r.values[metric]);
            const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
            const stddev = Math.sqrt(variance);

            acc[metric] = { avg, stddev };
            return acc;
        }, {} as Record<string, MetricSummary>);

        return {
            id: this.id,
            model: this.model,
            parameters: this.parameters,
            metrics: metricsSummary,
            created_at: this.created_at,
            ...(bestResults && { [`best_${best_n}`]: bestResults }),
            ...(worstResults && { [`worst_${worst_n}`]: worstResults })
        };
    }
}

export class RunsResource extends Resource {
    constructor(client: BaseQuotientClient) {
        super(client);
    }

    async list(): Promise<Run[]> {
        const response = await this.client.get('/runs') as RunResponse[];
        return response.map(runData => new Run(this.client, runData));
    }

    async getRun(run_id: string): Promise<Run> {
        const response = await this.client.get(`/runs/${run_id}`) as RunResponse;
        return new Run(this.client, response);
    }

    async create(prompt: Prompt, dataset: Dataset, model: Model, parameters: Record<string, any>, metrics: string[]): Promise<Run> {
        const response = await this.client.post('/runs', {
            prompt_id: prompt.id,
            dataset_id: dataset.id,
            model_id: model.id,
            parameters,
            metrics
        }) as RunResponse;
        return new Run(this.client, response);
    }

    async compare(runs: Run[]): Promise<Record<string, any> | null> {
        if (runs.length <= 1) {
            return null;
        }

        if (new Set(runs.map(run => run.dataset)).size > 1) {
            throw new Error("All runs must be on the same dataset to compare them");
        }

        if (new Set(runs.map(run => run.prompt)).size > 1 && 
            new Set(runs.map(run => run.model)).size > 1) {
            throw new Error("All runs must be on the same prompt or model to compare them");
        }

        const summaries = runs.map(run => run.summarize());
        
        if (runs.length === 2) {
            const comparison: Record<string, { avg: number; stddev: number }> = {};
            for (const metric of runs[0].metrics) {
                comparison[metric] = {
                    avg: summaries[0]!.metrics[metric].avg - summaries[1]!.metrics[metric].avg,
                    stddev: summaries[0]!.metrics[metric].stddev
                };
            }
            return comparison;
        } else if (runs.length > 2) {
            const comparison: Record<string, Record<string, { avg: number; stddev: number }>> = {};
            for (const run of runs) {
                comparison[run.id] = {};
                for (const metric of run.metrics) {
                    comparison[run.id][metric] = {
                        avg: summaries[0]!.metrics[metric].avg - summaries[1]!.metrics[metric].avg,
                        stddev: summaries[0]!.metrics[metric].stddev
                    };
                }
            }
            return comparison;
        }
        
        return null;
    }
}