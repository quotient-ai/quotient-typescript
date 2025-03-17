import { Resource } from './base';
import { BaseQuotientClient } from '../client';

export class AuthResource extends Resource {
  constructor(client: BaseQuotientClient) {
    super(client);
  }

  async authenticate(): Promise<any> {
    const response = await this.client.get('/auth/profile');
    return response;
  }
}

