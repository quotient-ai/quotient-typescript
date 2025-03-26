import { BaseQuotientClient } from '../client';

interface LogResponse {
    id: string;
    app_name: string;
    environment: string;
    hallucination_detection: boolean;
    inconsistency_detection: boolean;
    user_query: string;
    model_output: string;
    documents: string[];
    message_history: any[] | null;
    instructions: string[] | null;
    tags: Record<string, any>;
    created_at: string;
}

interface LogsResponse {
    logs: LogResponse[];
}

interface CreateLogParams {
    app_name: string;
    environment: string;
    hallucination_detection: boolean;
    inconsistency_detection: boolean;
    user_query: string;
    model_output: string;
    documents: string[];
    message_history?: any[] | null;
    instructions?: string[] | null;
    tags?: Record<string, any>;
    hallucination_detection_sample_rate?: number;
}

interface ListLogsParams {
    app_name?: string;
    environment?: string;
    start_date?: Date;
    end_date?: Date;
    limit?: number;
    offset?: number;
}

export class Log {
    id: string;
    app_name: string;
    environment: string;
    hallucination_detection: boolean;
    inconsistency_detection: boolean;
    user_query: string;
    model_output: string;
    documents: string[];
    message_history: any[] | null;
    instructions: string[] | null;
    tags: Record<string, any>;
    created_at: Date;

    constructor(data: LogResponse) {
        this.id = data.id;
        this.app_name = data.app_name;
        this.environment = data.environment;
        this.hallucination_detection = data.hallucination_detection;
        this.inconsistency_detection = data.inconsistency_detection;
        this.user_query = data.user_query;
        this.model_output = data.model_output;
        this.documents = data.documents;
        this.message_history = data.message_history;
        this.instructions = data.instructions;
        this.tags = data.tags;
        this.created_at = new Date(data.created_at);
    }

    toString(): string {
        return `Log(id="${this.id}", app_name="${this.app_name}", environment="${this.environment}", created_at="${this.created_at.toISOString()}")`;
    }
}

export class LogsResource {
    protected client: BaseQuotientClient;

    constructor(client: BaseQuotientClient) {
        this.client = client;
    }

    async create(params: CreateLogParams): Promise<void> {
        try {
            await this.client.post('/logs', params);
        } catch (error) {
            console.error('Error posting log:', error);
            // Don't throw the error, just log it
        }
    }

    async list(params: ListLogsParams = {}): Promise<Log[]> {
        const queryParams: Record<string, any> = {};
        
        if (params.app_name) queryParams.app_name = params.app_name;
        if (params.environment) queryParams.environment = params.environment;
        if (params.start_date) queryParams.start_date = params.start_date.toISOString();
        if (params.end_date) queryParams.end_date = params.end_date.toISOString();
        if (params.limit !== undefined) queryParams.limit = params.limit;
        if (params.offset !== undefined) queryParams.offset = params.offset;

        try {
            const response = await this.client.get('/logs', { params: queryParams }) as LogsResponse;
            return response.logs.map(logData => new Log(logData));
        } catch (error) {
            console.error('Error listing logs:', error);
            throw error;
        }
    }
}