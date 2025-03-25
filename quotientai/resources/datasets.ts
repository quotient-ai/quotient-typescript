import { BaseQuotientClient } from '../client';
import { Dataset, DatasetRow, DatasetRowMetadata } from '../types';

export interface DatasetRowResponse {
  id: string;
  input: string;
  context?: string;
  expected?: string;
  annotation?: string;
  annotation_note?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface DatasetResponse {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  description?: string;
  dataset_rows?: DatasetRowResponse[];
}

interface ListOptions {
  includeRows?: boolean;
}

export class DatasetsResource {
  protected client: BaseQuotientClient;

  constructor(client: BaseQuotientClient) {
    this.client = client;
  }

  async list(options: ListOptions = {}): Promise<Dataset[]> {
    const response = await this.client.get('/datasets') as DatasetResponse[];
    const datasets: Dataset[] = [];

    for (const dataset of response) {
      let rows: DatasetRow[] | undefined;
      if (options.includeRows) {
        const rowsResponse = await this.client.get(`/datasets/${dataset.id}/rows`) as DatasetRowResponse[];
        rows = rowsResponse.map(row => ({
          id: row.id,
          input: row.input,
          context: row.context,
          expected: row.expected,
          metadata: {
            annotation: row.annotation,
            annotation_note: row.annotation_note
          } as DatasetRowMetadata,
          created_by: row.created_by,
          created_at: new Date(row.created_at),
          updated_at: new Date(row.updated_at)
        }));
      }
      datasets.push({
        id: dataset.id,
        name: dataset.name,
        created_by: dataset.created_by,
        description: dataset.description,
        created_at: new Date(dataset.created_at),
        updated_at: new Date(dataset.updated_at),
        rows
      });
    }
    return datasets;
  }

  async get(id: string): Promise<Dataset> {
    const response = await this.client.get(`/datasets/${id}`) as DatasetResponse;
    let rows: DatasetRow[] | undefined;

    rows = response.dataset_rows?.map(row => ({
      id: row.id,
      input: row.input,
      context: row.context,
      expected: row.expected,
      metadata: {
        annotation: row.annotation,
        annotation_note: row.annotation_note
      } as DatasetRowMetadata,
      created_by: row.created_by,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }));

    return {
      id: response.id,
      name: response.name,
      created_by: response.created_by,
      description: response.description,
      created_at: new Date(response.created_at),
      updated_at: new Date(response.updated_at),
      rows
    };
  }

  async create(name: string, description?: string, rows?: DatasetRow[]): Promise<Dataset> {
    const response = await this.client.post('/datasets', {
      name,
      description
    }) as DatasetResponse;

    const id = response.id;
    let rowResponses: DatasetRowResponse[] = [];
    let datasetRows: DatasetRow[] = [];
    if (rows) {
      let results = await this.batchCreateRows(id, rows, rowResponses);
      datasetRows = results.map(result => ({
        id: result.id,
        input: result.input,
        context: result.context,
        expected: result.expected,
        metadata: {
          annotation: result.annotation,
          annotation_note: result.annotation_note
        },
        created_by: result.created_by,
        created_at: new Date(result.created_at),
        updated_at: new Date(result.updated_at)
      }));
    } else {
      datasetRows = [];
    }

    return {
      id: response.id,
      name: response.name,
      created_by: response.created_by,
      description: response.description,
      created_at: new Date(response.created_at),
      updated_at: new Date(response.updated_at),
      rows: datasetRows
    };
  }

  async update(dataset: Dataset, name?: string, description?: string, rows?: DatasetRow[]): Promise<Dataset> {
    const payload = {
      name,
      description, 
      rows: rows?.map(row => ({
        id: row.id,
        input: row.input,
        context: row.context,
        expected: row.expected,
        annotation: row.metadata.annotation,
        annotation_note: row.metadata.annotation_note
      })),
    }
    const response = await this.client.patch(`/datasets/${dataset.id}`, payload) as DatasetResponse;

    return {
      id: response.id,
      name: response.name,
      created_by: response.created_by,
      description: response.description,
      created_at: new Date(response.created_at),
      updated_at: new Date(response.updated_at),
      rows: response.dataset_rows?.map(row => ({
        id: row.id,
        input: row.input,
        context: row.context,
        expected: row.expected,
        metadata: {
          annotation: row.annotation,
          annotation_note: row.annotation_note
        },
        created_by: row.created_by,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      }))
    };
  }

  async append(dataset: Dataset, rows: DatasetRow[]): Promise<Dataset> {
    let rowResponses: DatasetRowResponse[] = [];
    let datasetRows: DatasetRow[] = [];
    let results = await this.batchCreateRows(dataset.id, rows, rowResponses);
    datasetRows = results.map(result => ({
      id: result.id,
      input: result.input,
      context: result.context,
      expected: result.expected,
      metadata: {
        annotation: result.annotation,
        annotation_note: result.annotation_note
      },
      created_by: result.created_by,
      created_at: new Date(result.created_at),
      updated_at: new Date(result.updated_at)
    }));

    return {
      id: dataset.id,
      name: dataset.name,
      created_by: dataset.created_by,
      description: dataset.description,
      created_at: dataset.created_at,
      updated_at: dataset.updated_at,
      rows: dataset.rows ? [...dataset.rows, ...datasetRows] : datasetRows
    };
  }

  async delete(dataset: Dataset, rows?: DatasetRow[]): Promise<void> { 
    if (rows) {
      for (const row of rows) {
        await this.client.patch(`/datasets/${dataset.id}/dataset_rows/${row.id}`, {
          id: row.id,
          input: row.input,
          context: row.context,
          expected: row.expected,
          annotation: row.metadata.annotation,
          annotation_note: row.metadata.annotation_note,
          is_deleted: true
        });
      }
    } else {
      await this.client.patch(`/datasets/${dataset.id}`, {
        name: dataset.name,
        description: dataset.description,
        is_deleted: true
      });
    }
  }

  async batchCreateRows(datasetID: string, rows: DatasetRow[], rowResponses: DatasetRowResponse[], batchSize: number = 10): Promise<DatasetRowResponse[]> {
    // Process rows in batches
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      try {
        const response = await this.client.post(
          `/datasets/${datasetID}/dataset_rows/batch`,
          { rows: batch }
        ) as DatasetRowResponse[];
        rowResponses.push(...response);
      } catch (e) {
        // If batch create fails, divide batch size by two and try recursively
        if (batchSize === 1) {
          throw e;
        } else {
          await this.batchCreateRows(datasetID, batch, rowResponses, Math.floor(batchSize / 2));
        }
      }
    }
    return rowResponses;
  }
}