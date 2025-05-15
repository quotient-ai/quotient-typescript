import {describe, it, expect, vi} from 'vitest';
import { BaseQuotientClient } from '../../quotientai/client';
import { LogsResource, Log } from '../../quotientai/resources/logs';

describe('LogsResource', () => {
    const mockLogs = [
        {
            id: 'log-1',
            app_name: 'test-app',
            environment: 'development',
            hallucination_detection: true,
            inconsistency_detection: false,
            user_query: 'What is the capital of France?',
            model_output: 'Paris is the capital of France.',
            documents: ['doc1', 'doc2', { pageContent: 'doc3', metadata: { source: 'test' } }],
            message_history: [
                { role: 'user', content: 'What is the capital of France?' },
                { role: 'assistant', content: 'Paris is the capital of France.' }
            ],
            instructions: ['Be concise', 'Be accurate'],
            tags: { user_id: '123' },
            created_at: '2024-03-20T10:00:00Z'
        },
        {
            id: 'log-2',
            app_name: 'test-app',
            environment: 'production',
            hallucination_detection: false,
            inconsistency_detection: true,
            user_query: 'What is the population of Tokyo?',
            model_output: 'Tokyo has a population of approximately 37.4 million people.',
            documents: ['doc3'],
            message_history: null,
            instructions: null,
            tags: { user_id: '456' },
            created_at: '2024-03-20T11:00:00Z'
        }
    ];

    describe('Log class', () => {
        it('should format log as string', () => {
            const log = new Log(mockLogs[0]);
            const expectedString = `Log(id="log-1", appName="test-app", environment="development", createdAt="2024-03-20T10:00:00.000Z")`;
            expect(log.toString()).toBe(expectedString);
        });
    });

    it('should list logs with default parameters', async () => {
        const client = new BaseQuotientClient('test');
        vi.spyOn(client, 'get').mockResolvedValue({
            logs: mockLogs
        });
        
        const logsResource = new LogsResource(client);
        const logs = await logsResource.list();
        
        expect(logs).toHaveLength(2);
        expect(logs[0]).toBeInstanceOf(Log);
        expect(logs[0].id).toBe('log-1');
        expect(logs[0].appName).toBe('test-app');
        expect(logs[0].environment).toBe('development');
        expect(logs[0].createdAt).toBeInstanceOf(Date);
        expect(client.get).toHaveBeenCalledWith('/logs', {});
    });

    it('should list logs with query parameters', async () => {
        const client = new BaseQuotientClient('test');
        vi.spyOn(client, 'get').mockResolvedValue({
            logs: [mockLogs[0]]
        });
        
        const logsResource = new LogsResource(client);
        const startDate = new Date('2024-03-20T00:00:00Z');
        const endDate = new Date('2024-03-20T23:59:59Z');
        
        const logs = await logsResource.list({
            appName: 'test-app',
            environment: 'development',
            startDate: startDate,
            endDate: endDate,
            limit: 10,
            offset: 0
        });
        
        expect(logs).toHaveLength(1);
        expect(logs[0].environment).toBe('development');
        expect(client.get).toHaveBeenCalledWith('/logs', {
            app_name: 'test-app',
            environment: 'development',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            limit: 10,
            offset: 0
        });
    });

    it('should handle errors when listing logs', async () => {
        const client = new BaseQuotientClient('test');
        const consoleErrorSpy = vi.spyOn(console, 'error');
        vi.spyOn(client, 'get').mockRejectedValue(new Error('Test error'));

        const logsResource = new LogsResource(client);
        const result = await logsResource.list();
        
        expect(result).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('[LogsResource.list] Error: Test error')
        );
        expect(client.get).toHaveBeenCalledWith('/logs', {});
    });

    // Tests for the edge cases in list method (lines 117-119)
    it('should handle null response from API', async () => {
        const client = new BaseQuotientClient('test');
        vi.spyOn(client, 'get').mockResolvedValue(null);
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        const logsResource = new LogsResource(client);
        const logs = await logsResource.list();
        
        expect(logs).toHaveLength(0);
        expect(consoleSpy).toHaveBeenCalledWith('No logs found. Please check your query parameters and try again.');
        expect(client.get).toHaveBeenCalledWith('/logs', {});
    });
    
    it('should handle response with missing logs property', async () => {
        const client = new BaseQuotientClient('test');
        vi.spyOn(client, 'get').mockResolvedValue({});
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        const logsResource = new LogsResource(client);
        const logs = await logsResource.list();
        
        expect(logs).toHaveLength(0);
        expect(consoleSpy).toHaveBeenCalledWith('No logs found. Please check your query parameters and try again.');
        expect(client.get).toHaveBeenCalledWith('/logs', {});
    });
    
    it('should handle response with logs not being an array', async () => {
        const client = new BaseQuotientClient('test');
        vi.spyOn(client, 'get').mockResolvedValue({ logs: 'not an array' });
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        const logsResource = new LogsResource(client);
        const logs = await logsResource.list();
        
        expect(logs).toHaveLength(0);
        expect(consoleSpy).toHaveBeenCalledWith('No logs found. Please check your query parameters and try again.');
        expect(client.get).toHaveBeenCalledWith('/logs', {});
    });

    it('should create a log', async () => {
        const client = new BaseQuotientClient('test');
        vi.spyOn(client, 'post').mockResolvedValue({
            id: 'log-1'
        });

        const logsResource = new LogsResource(client);
        await logsResource.create({
            appName: 'test-app',
            environment: 'development',
            hallucinationDetection: true,
            inconsistencyDetection: false,
            userQuery: 'What is the capital of France?',
            modelOutput: 'Paris is the capital of France.',
            documents: ['doc1', 'doc2'],
            messageHistory: [
                { role: 'user', content: 'What is the capital of France?' },
                { role: 'assistant', content: 'Paris is the capital of France.' }
            ],
            instructions: ['Be concise', 'Be accurate'],
            tags: { user_id: '123' },
            hallucinationDetectionSampleRate: 0.5
        });

        expect(client.post).toHaveBeenCalledWith('/logs', {
            app_name: 'test-app',
            environment: 'development',
            hallucination_detection: true,
            inconsistency_detection: false,
            user_query: 'What is the capital of France?',
            model_output: 'Paris is the capital of France.',
            documents: ['doc1', 'doc2'],
            message_history: [  
                { role: 'user', content: 'What is the capital of France?' },
                { role: 'assistant', content: 'Paris is the capital of France.' }
            ],
            instructions: ['Be concise', 'Be accurate'],
            tags: { user_id: '123' },
            hallucination_detection_sample_rate: 0.5
        });
    });

    it('should handle errors when creating a log', async () => {
        const client = new BaseQuotientClient('test');
        const consoleErrorSpy = vi.spyOn(console, 'error');
        vi.spyOn(client, 'post').mockRejectedValue(new Error('Test error'));

        const logsResource = new LogsResource(client);
        const result = await logsResource.create({
            appName: 'test-app',
            environment: 'development',
            hallucinationDetection: true,
            inconsistencyDetection: false,
            userQuery: 'What is the capital of France?',
            modelOutput: 'Paris is the capital of France.',
            documents: ['doc1', 'doc2'],
            messageHistory: [
                { role: 'user', content: 'What is the capital of France?' },
                { role: 'assistant', content: 'Paris is the capital of France.' }
            ],
            instructions: ['Be concise', 'Be accurate'],    
            tags: { user_id: '123' },
            hallucinationDetectionSampleRate: 0.5
        });

        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('[LogsResource.create] Error: Test error')
        );
        expect(client.post).toHaveBeenCalledWith('/logs', {
            app_name: 'test-app',
            environment: 'development',
            hallucination_detection: true,
            inconsistency_detection: false,
            user_query: 'What is the capital of France?',
            model_output: 'Paris is the capital of France.',
            documents: ['doc1', 'doc2'],
            message_history: [
                { role: 'user', content: 'What is the capital of France?' },
                { role: 'assistant', content: 'Paris is the capital of France.' }
            ],
            instructions: ['Be concise', 'Be accurate'],
            tags: { user_id: '123' },
            hallucination_detection_sample_rate: 0.5
        });
    });


});