import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuotientAI } from '../quotientai/index';
import { BaseQuotientClient } from '../quotientai/client';

vi.mock('../quotientai/client', () => {
    return {
        BaseQuotientClient: vi.fn().mockImplementation((apiKey) => {
            return {
                apiKey,
                client: {
                    defaults: {
                        headers: {
                            common: {}
                        }
                    }
                },
                get: vi.fn(),
                post: vi.fn(),
                patch: vi.fn(),
                delete: vi.fn()
            };
        })
    };
});

// Mock AuthResource at the module level
const mockAuthenticate = vi.fn().mockResolvedValue({});
vi.mock('../quotientai/resources/auth', () => {
    return {
        AuthResource: vi.fn().mockImplementation(() => ({
            authenticate: mockAuthenticate,
            client: new BaseQuotientClient('test_api_key')
        }))
    };
});

describe('QuotientAI', () => {
    beforeEach(() => {
        // Reset environment variable and mocks before each test
        process.env.QUOTIENT_API_KEY = undefined;
        vi.clearAllMocks();
    });

    it('should initialize with the correct api key', () => {
        new QuotientAI('test_api_key');
        expect(BaseQuotientClient).toHaveBeenCalledWith('test_api_key');
    });

    it('should initialize with the correct api key from environment variable', () => {
        process.env.QUOTIENT_API_KEY = 'test_api_key';
        new QuotientAI();
        expect(BaseQuotientClient).toHaveBeenCalledWith('test_api_key');
    });

    it('should log an error if no api key is provided', () => {
        process.env.QUOTIENT_API_KEY = '';
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        new QuotientAI()
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Could not find API key. Either pass apiKey to QuotientAI() or set the QUOTIENT_API_KEY environment variable. If you do not have an API key, you can create one at https://app.quotientai.co in your settings page'));
    });
    
    it('should call the auth resource on initialization', async () => {
        new QuotientAI('test_api_key');
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(mockAuthenticate).toHaveBeenCalledOnce();
    });

    it('should log an error if parameters are invalid', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const quotientAI = new QuotientAI('test_api_key');
        await quotientAI.evaluate({
            prompt: {
                id: 'test_id',
                name: 'test_name',
                content: 'test_content',
                version: 1,
                user_prompt: 'test_prompt',
                created_at: new Date(),
                updated_at: new Date()
            },
            dataset: { 
                id: 'test_dataset', 
                name: 'test', 
                created_at: new Date(),
                created_by: 'test_user',
                updated_at: new Date()
            },
            model: { id: 'test_model', name: 'test', provider: { id: 'test', name: 'test' }, created_at: new Date() },
            parameters: {
                invalid_param: 'value'
            },
            metrics: ['test_metric']
        })
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid parameters: invalid_param. Valid parameters are: temperature, top_k, top_p, max_tokens'));
    });

    it('should successfully evaluate if all parameters are valid', async () => {
        const quotientAI = new QuotientAI('test_api_key');
        const mockRun = {
            id: 'test_run',
            status: 'completed'
        };
        
        // Mock the runs.create method
        quotientAI.runs.create = vi.fn().mockResolvedValue(mockRun);
        
        const result = await quotientAI.evaluate({
            prompt: {
                id: 'test_id',
                name: 'test_name',
                content: 'test_content',
                version: 1,
                user_prompt: 'test_prompt',
                created_at: new Date(),
                updated_at: new Date()
            },
            dataset: { 
                id: 'test_dataset', 
                name: 'test', 
                created_at: new Date(),
                created_by: 'test_user',
                updated_at: new Date()
            },
            model: { id: 'test_model', name: 'test', provider: { id: 'test', name: 'test' }, created_at: new Date() },
            parameters: {
                temperature: 0.5,
                top_k: 10,
                top_p: 0.9,
                max_tokens: 100,
            },
            metrics: ['test_metric'],
        });
        
        expect(result).toBe(mockRun);
        expect(quotientAI.runs.create).toHaveBeenCalledWith({
          prompt: expect.objectContaining({ id: 'test_id' }),
          dataset: expect.objectContaining({ id: 'test_dataset' }),
          model: expect.objectContaining({ id: 'test_model' }),
          parameters: {
            max_tokens: 100,
            temperature: 0.5,
            top_k: 10,
            top_p: 0.9,
          },
          metrics: ['test_metric']
        });
    });

    it('should handle authentication errors during initialization', () => {
        // Mock the authenticate method to throw an error
        const error = new Error('Authentication failed');
        mockAuthenticate.mockImplementationOnce(() => {
            throw error;
        });

        // Spy on console.error
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Create a new instance
        const quotient = new QuotientAI('test_api_key');
        
        // Verify error was logged with correct message
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('If you are seeing this error, please check that your API key is correct.')
        );
        expect(quotient).toBeDefined();
    });
});
