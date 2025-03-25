import { BaseQuotientClient } from '../client';
import { Model, ModelProvider } from '../types';

interface ModelResponse {
  id: string;
  name: string;
  provider: ModelProvider;
  created_at: string;
}

export class ModelsResource {
  protected client: BaseQuotientClient;

  constructor(client: BaseQuotientClient) {
    this.client = client;
  }

  async list(): Promise<Model[]> {
    const response = await this.client.get('/models') as ModelResponse[];
    return response.map(model => ({
      ...model,
      created_at: new Date(model.created_at)
    }));
  }

  async getModel(name: string): Promise<Model> {
    const response = await this.client.get(`/models/${name}`) as ModelResponse;
    return {
      ...response,
      created_at: new Date(response.created_at)
    };
  }
}