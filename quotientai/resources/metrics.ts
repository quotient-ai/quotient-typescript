import { BaseQuotientClient } from '../client';

interface MetricsResponse {
    data: string[];
}

export class MetricsResource {
    protected client: BaseQuotientClient;

    constructor(client: BaseQuotientClient) {
        this.client = client;
    }

    // list all metrics
    // no params
    async list(): Promise<string[]> {
        const response = await this.client.get('/runs/metrics') as MetricsResponse;
        return response.data;
    }
}