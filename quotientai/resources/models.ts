import { logError } from '../exceptions';
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

  // list all models
  // no params
  async list(): Promise<Model[]> {
    const response = await this.client.get('/models') as ModelResponse[];
    return response.map(model => ({
      ...model,
      created_at: new Date(model.created_at)
    }));
  }

  // get a model
  // name: string
  async getModel(name: string): Promise<Model | null> {
    const response = await this.client.get(`/models/${name}`) as ModelResponse;
    if (!response) {
      logError(new Error(`Model with name ${name} not found. Please check the list of available models using quotient.models.list()`));
      return null;
    }
    return {
      ...response,
      created_at: new Date(response.created_at)
    };
  }
}