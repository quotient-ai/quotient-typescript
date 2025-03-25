import { BaseQuotientClient } from '../client';
import { Resource } from './base';

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

export class LogsResource extends Resource {
    private logQueue: any[] = [];
    private isProcessing: boolean = false;
    private processingInterval: NodeJS.Timeout | null = null;

    constructor(client: BaseQuotientClient) {
        super(client);
        this.startProcessing();
    }

    private startProcessing(): void {
        this.processingInterval = setInterval(() => {
            this.processLogQueue();
        }, 100);
    }

    private async processLogQueue(): Promise<void> {
        if (this.isProcessing || this.logQueue.length === 0) {
            return;
        }

        this.isProcessing = true;
        try {
            const logData = this.logQueue.shift();
            if (logData) {
                await this._post_log(logData);
            }
        } catch (error) {
            console.error('Error processing log queue:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    create(params: CreateLogParams): void {
        // Create is non-blocking, so we add to queue and return immediately
        this.logQueue.push(params);
    }

    async list(params: ListLogsParams = {}): Promise<Log[]> {
        const queryParams: Record<string, any> = {};
        
        if (params.app_name) queryParams.app_name = params.app_name;
        if (params.environment) queryParams.environment = params.environment;
        if (params.start_date) queryParams.start_date = params.start_date.toISOString();
        if (params.end_date) queryParams.end_date = params.end_date.toISOString();
        if (params.limit) queryParams.limit = params.limit;
        if (params.offset) queryParams.offset = params.offset;

        try {
            const response = await this.client.get('/logs', { params: queryParams }) as LogsResponse;
            return response.logs.map(logData => new Log(logData));
        } catch (error) {
            console.error('Error listing logs:', error);
            throw error;
        }
    }

    private async _post_log(data: Record<string, any>): Promise<void> {
        try {
            await this.client.post('/logs', data);
        } catch (error) {
            console.error('Error posting log:', error);
            // Don't throw the error, just log it
        }
    }

    // Cleanup method to stop the processing interval
    cleanup(): void {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
    }
}

export class AsyncLogsResource extends Resource {
    constructor(client: BaseQuotientClient) {
        super(client);
    }

    async create(params: CreateLogParams): Promise<void> {
        // Create is non-blocking, so we don't wait for the response
        this._post_log_in_background(params).catch(console.error);
    }

    async list(params: ListLogsParams = {}): Promise<Log[]> {
        const queryParams: Record<string, any> = {};
        
        if (params.app_name) queryParams.app_name = params.app_name;
        if (params.environment) queryParams.environment = params.environment;
        if (params.start_date) queryParams.start_date = params.start_date.toISOString();
        if (params.end_date) queryParams.end_date = params.end_date.toISOString();
        if (params.limit) queryParams.limit = params.limit;
        if (params.offset) queryParams.offset = params.offset;

        try {
            const response = await this.client.get('/logs', { params: queryParams }) as LogsResponse;
            return response.logs.map(logData => new Log(logData));
        } catch (error) {
            console.error('Error listing logs:', error);
            throw error;
        }
    }

    private async _post_log_in_background(data: Record<string, any>): Promise<void> {
        try {
            await this.client.post('/logs', data);
        } catch (error) {
            console.error('Error posting log:', error);
            // Don't throw the error, just log it
        }
    }
} 