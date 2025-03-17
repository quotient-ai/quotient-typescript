import { BaseQuotientClient } from '../client';
import { BaseResource } from '../types';

export abstract class Resource implements BaseResource {
  public client: BaseQuotientClient;

  constructor(client: BaseQuotientClient) {
    this.client = client;
  }

  protected async get<T>(path: string, params?: Record<string, any>, timeout?: number): Promise<T> {
    return this.client.get(path, params, timeout);
  }

  protected async post<T>(path: string, data: any = {}, timeout?: number): Promise<T> {
    return this.client.post(path, data, timeout);
  }

  protected async patch<T>(path: string, data: any = {}, timeout?: number): Promise<T> {
    return this.client.patch(path, data, timeout);
  }

  protected async delete<T>(path: string, timeout?: number): Promise<T> {
    return this.client.delete(path, timeout);
  }
} 