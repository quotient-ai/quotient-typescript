import { Resource } from './base';
import { BaseQuotientClient } from '../client';
import { Dataset } from '../types';

interface DatasetResponse {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  description?: string;
}

export class DatasetsResource extends Resource {
  constructor(client: BaseQuotientClient) {
    super(client);
  }

  async list(include_rows: boolean = false): Promise<Dataset[]> {
    const response = await this.client.get('/datasets') as DatasetResponse[];
    const datasets: Dataset[] = [];

    for (const dataset of response) {
      datasets.push({
        ...dataset,
        created_at: new Date(dataset.created_at),
        updated_at: new Date(dataset.updated_at)
      });
    }
    return datasets;
  }
}