import { BaseQuotientClient } from '../client';

export class AuthResource {
  protected client: BaseQuotientClient;

  constructor(client: BaseQuotientClient) {
    this.client = client;
  }

  async authenticate(): Promise<any> {
    const response = await this.client.get('/auth/profile');
    return response;
  }
}

