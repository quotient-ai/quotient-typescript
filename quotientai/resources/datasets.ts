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

interface CreateDatasetParams {
  name: string;
  description?: string;
  rows?: CreateDatasetRowParams[];
  model_id?: string;
  user_id?: string;
  tags?: Record<string, string>;
}

interface CreateDatasetRowParams {
  input: string;
  context?: string;
  expected?: string;
  metadata?: CreateDatasetRowMetadataParams;
}

interface CreateDatasetRowMetadataParams {
  annotation?: string;
  annotation_note?: string;
}

interface AppendDatasetParams {
  dataset: Dataset;
  rows?: CreateDatasetRowParams[];
}

interface UpdateDatasetParams extends AppendDatasetParams {
  name?: string;
  description?: string;
}

interface DeleteDatasetParams {
  dataset: Dataset;
  rows?: DatasetRow[];
}

export class DatasetsResource {
  protected client: BaseQuotientClient;

  constructor(client: BaseQuotientClient) {
    this.client = client;
  }

  // list all datasets
  // options: ListOptions
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

  // get a dataset
  // id: string
  async get(id: string): Promise<Dataset> {
    const response = await this.client.get(`/datasets/${id}`) as DatasetResponse;

    const rows = response.dataset_rows?.map(row => ({
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

  // create a dataset
  // options: CreateDatasetParams
  async create(options: CreateDatasetParams): Promise<Dataset> {
    const response = await this.client.post('/datasets', {
      name: options.name,
      description: options.description,
      rows: options.rows?.map(row => ({
        input: row.input,
        context: row.context,
        expected: row.expected,
        metadata: row.metadata
      })),
      model_id: options.model_id,
      user_id: options.user_id,
      tags: options.tags
    }) as DatasetResponse;

    const id = response.id;
    const rowResponses: DatasetRowResponse[] = [];
    let datasetRows: DatasetRow[] = [];
    if (options.rows) {
      const results = await this.batchCreateRows(id, options.rows, rowResponses);
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

  // update a dataset
  // dataset: Dataset, name?: string, description?: string, rows?: DatasetRow[]
  async update(options: UpdateDatasetParams): Promise<Dataset> {
    const payload = {
      name: options.name,
      description: options.description, 
      rows: options.rows?.map(row => ({
        input: row.input,
        context: row.context,
        expected: row.expected,
        annotation: row.metadata?.annotation,
        annotation_note: row.metadata?.annotation_note
      })),
    }
    const response = await this.client.patch(`/datasets/${options.dataset.id}`, payload) as DatasetResponse;

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

  // append rows to a dataset
  // options: AppendDatasetParams
  async append(options: AppendDatasetParams): Promise<Dataset> {
    if (!options.rows) {
      throw new Error('rows are required');
    }
    const rowResponses: DatasetRowResponse[] = [];
    let datasetRows: DatasetRow[] = [];
    const results = await this.batchCreateRows(options.dataset.id, options.rows, rowResponses);
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
      id: options.dataset.id,
      name: options.dataset.name,
      created_by: options.dataset.created_by,
      description: options.dataset.description,
      created_at: options.dataset.created_at,
      updated_at: options.dataset.updated_at,
      rows: options.dataset.rows ? [...options.dataset.rows, ...datasetRows] : datasetRows
    };
  }

  // delete a dataset
  // options: DeleteDatasetParams
  async delete(options: DeleteDatasetParams): Promise<void> { 
    if (options.rows) {
      for (const row of options.rows) {
        await this.client.patch(`/datasets/${options.dataset.id}/dataset_rows/${row.id}`, {
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
      await this.client.patch(`/datasets/${options.dataset.id}`, {
        name: options.dataset.name,
        description: options.dataset.description,
        is_deleted: true
      });
    }
  }

  // batch create rows
  // datasetID: string, rows: DatasetRow[], rowResponses: DatasetRowResponse[], batchSize: number = 10
  async batchCreateRows(datasetID: string, rows: CreateDatasetRowParams[], rowResponses: DatasetRowResponse[], batchSize: number = 10): Promise<DatasetRowResponse[]> {
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