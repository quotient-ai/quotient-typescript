import { BaseQuotientClient } from '../client';
import { Resource } from './base';

interface MetricsResponse {
    data: string[];
}

export class MetricsResource extends Resource {
    constructor(client: BaseQuotientClient) {
        super(client);
    }

    async list(): Promise<string[]> {
        const response = await this.client.get('/runs/metrics') as MetricsResponse;
        return response.data;
    }
}

export class AsyncMetricsResource extends Resource {
    constructor(client: BaseQuotientClient) {
        super(client);
    }

    async list(): Promise<string[]> {
        const response = await this.client.get('/runs/metrics') as MetricsResponse;
        return response.data;
    }
} 