import { describe, it, expect, vi } from 'vitest';
import { QuotientLogger } from '../quotientai/logger';
import { ValidationError } from '../quotientai/exceptions';

describe('QuotientLogger', () => {
    it('should initialize without being configured', () => {
        const mockLogsResource = { create: vi.fn(), list: vi.fn() };
        const logger = new QuotientLogger(mockLogsResource);
        const privateLogger = logger as any;
        expect(logger).toBeDefined();
        expect(privateLogger.configured).toBe(false);
        expect(privateLogger.sampleRate).toBe(1.0);
        expect(privateLogger.tags).toEqual({});
        expect(privateLogger.hallucinationDetection).toBe(false);
        expect(privateLogger.inconsistencyDetection).toBe(false);
        expect(privateLogger.hallucinationDetectionSampleRate).toBe(0.0);
    });

    it('should use default values when not provided', () => {
        const mockLogsResource = { create: vi.fn(), list: vi.fn() };
        const logger = new QuotientLogger(mockLogsResource);
        const privateLogger = logger as any;
        
        privateLogger.init({
            app_name: 'test_app',
            environment: 'test_environment'
        });
        
        expect(privateLogger.sampleRate).toBe(1.0);
        expect(privateLogger.appName).toBe('test_app');
        expect(privateLogger.environment).toBe('test_environment'); 
        expect(privateLogger.tags).toEqual({});
        expect(privateLogger.hallucinationDetection).toBe(false);
        expect(privateLogger.inconsistencyDetection).toBe(false);
        expect(privateLogger.hallucinationDetectionSampleRate).toBe(0.0);
    });
    
    it('should initialize with the correct properties', () => {
        const mockLogsResource = { create: vi.fn(), list: vi.fn() };
        const logger = new QuotientLogger(mockLogsResource);
        const privateLogger = logger as any;
        
        privateLogger.init({
            app_name: 'test_app',
            environment: 'test_environment',
            tags: { test: 'test' },
            sample_rate: 0.5,
            hallucination_detection: true,
            inconsistency_detection: true,
            hallucination_detection_sample_rate: 0.5,
        });
        expect(privateLogger.appName).toBe('test_app');
        expect(privateLogger.environment).toBe('test_environment');
        expect(privateLogger.tags).toEqual({ test: 'test' });
        expect(privateLogger.sampleRate).toBe(0.5);
        expect(privateLogger.hallucinationDetection).toBe(true);
        expect(privateLogger.inconsistencyDetection).toBe(true);
        expect(privateLogger.hallucinationDetectionSampleRate).toBe(0.5);
        expect(privateLogger.configured).toBe(true);
    });
    
    it('should raise an error if sample rate is not between 0 and 1', () => {
        const mockLogsResource = { create: vi.fn(), list: vi.fn() };
        const logger = new QuotientLogger(mockLogsResource);
        const privateLogger = logger as any;
        expect(() => privateLogger.init({ sample_rate: 1.5 })).toThrow('sample_rate must be between 0.0 and 1.0');
    });
    
    it('should raise an error if you attempt to log before initializing', async () => {
        const mockLogsResource = { create: vi.fn(), list: vi.fn() };
        const logger = new QuotientLogger(mockLogsResource);
        const privateLogger = logger as any;
        await expect(privateLogger.log({ message: 'test' })).rejects.toThrow('Logger is not configured. Please call init() before logging.');
    });

    it('should log a message if initialized', async () => {
        const mockLogsResource = { create: vi.fn(), list: vi.fn() };
        const logger = new QuotientLogger(mockLogsResource);
        const privateLogger = logger as any;
        privateLogger.init({ app_name: 'test_app', environment: 'test_environment', tags: { test: 'test' }, sample_rate: 1.0 });
        await privateLogger.log({ message: 'test' });
        expect(mockLogsResource.create).toHaveBeenCalledWith({
            app_name: 'test_app',
            environment: 'test_environment',
            tags: { test: 'test' },
            message: 'test',
            hallucination_detection: false,
            hallucination_detection_sample_rate: 0,
            inconsistency_detection: false
        });
    });
    
    it('should not log a message if shouldSample returns false', async () => {
        const mockLogsResource = { create: vi.fn(), list: vi.fn() };
        const logger = new QuotientLogger(mockLogsResource);
        const privateLogger = logger as any;
        // Mock shouldSample to always return false
        vi.spyOn(privateLogger, 'shouldSample').mockReturnValue(false);
        
        privateLogger.init({ app_name: 'test_app', environment: 'test_environment', tags: { test: 'test' }, sample_rate: 0.5 });
        await privateLogger.log({ message: 'test' });
        expect(mockLogsResource.create).not.toHaveBeenCalled();
    });

    it('should verify shouldSample behavior based on Math.random', () => {
        const mockLogsResource = { create: vi.fn(), list: vi.fn() };
        const logger = new QuotientLogger(mockLogsResource);
        const privateLogger = logger as any;
        privateLogger.init({ sample_rate: 0.5 });

        // Test when random is less than sample rate
        vi.spyOn(Math, 'random').mockReturnValue(0.4);
        expect(privateLogger.shouldSample()).toBe(true);

        // Test when random is greater than sample rate
        vi.spyOn(Math, 'random').mockReturnValue(0.6);
        expect(privateLogger.shouldSample()).toBe(false);

        vi.spyOn(Math, 'random').mockRestore();
    });

    it('should raise an error if required app_name or environment is missing after initialization', async () => {
        const mockLogsResource = { create: vi.fn(), list: vi.fn() };
        const logger = new QuotientLogger(mockLogsResource);
        const privateLogger = logger as any;
        
        // Initialize but with null values
        privateLogger.init({});
        privateLogger.configured = true;
        privateLogger.appName = null;
        privateLogger.environment = 'test';
        
        await expect(privateLogger.log({ message: 'test' })).rejects.toThrow('Logger is not properly configured. app_name and environment must be set.');
        
        privateLogger.appName = 'test';
        privateLogger.environment = null;
        
        await expect(privateLogger.log({ message: 'test' })).rejects.toThrow('Logger is not properly configured. app_name and environment must be set.');
    });

    describe('Document Validation', () => {
        it('should accept string documents', async () => {
            const mockLogsResource = { create: vi.fn(), list: vi.fn() };
            const logger = new QuotientLogger(mockLogsResource);
            const privateLogger = logger as any;
            
            privateLogger.init({ app_name: 'test_app', environment: 'test_environment' });
            
            await privateLogger.log({
                user_query: 'test',
                model_output: 'test',
                documents: ['This is a string document']
            });
            
            expect(mockLogsResource.create).toHaveBeenCalled();
        });
        
        it('should accept valid LogDocument objects', async () => {
            const mockLogsResource = { create: vi.fn(), list: vi.fn() };
            const logger = new QuotientLogger(mockLogsResource);
            const privateLogger = logger as any;
            
            privateLogger.init({ app_name: 'test_app', environment: 'test_environment' });
            
            await privateLogger.log({
                user_query: 'test',
                model_output: 'test',
                documents: [
                    { page_content: 'This is valid content' },
                    { page_content: 'Also valid', metadata: { source: 'test' } }
                ]
            });
            
            expect(mockLogsResource.create).toHaveBeenCalled();
        });
        
        it('should throw ValidationError when document is missing page_content', async () => {
            const mockLogsResource = { create: vi.fn(), list: vi.fn() };
            const logger = new QuotientLogger(mockLogsResource);
            const privateLogger = logger as any;
            
            privateLogger.init({ app_name: 'test_app', environment: 'test_environment' });
            
            await expect(privateLogger.log({
                user_query: 'test',
                model_output: 'test',
                documents: [{ not_page_content: 'invalid' }]
            })).rejects.toThrow(ValidationError);
            
            expect(mockLogsResource.create).not.toHaveBeenCalled();
        });
        
        it('should throw ValidationError when page_content is not a string', async () => {
            const mockLogsResource = { create: vi.fn(), list: vi.fn() };
            const logger = new QuotientLogger(mockLogsResource);
            const privateLogger = logger as any;
            
            privateLogger.init({ app_name: 'test_app', environment: 'test_environment' });
            
            await expect(privateLogger.log({
                user_query: 'test',
                model_output: 'test',
                documents: [{ page_content: 123 }]
            })).rejects.toThrow(ValidationError);
            
            expect(mockLogsResource.create).not.toHaveBeenCalled();
        });
        
        it('should throw ValidationError when metadata is not an object', async () => {
            const mockLogsResource = { create: vi.fn(), list: vi.fn() };
            const logger = new QuotientLogger(mockLogsResource);
            const privateLogger = logger as any;
            
            privateLogger.init({ app_name: 'test_app', environment: 'test_environment' });
            
            await expect(privateLogger.log({
                user_query: 'test',
                model_output: 'test',
                documents: [{ page_content: 'Valid content', metadata: 'not an object' }]
            })).rejects.toThrow(ValidationError);
            
            expect(mockLogsResource.create).not.toHaveBeenCalled();
        });
        
        it('should throw ValidationError when document is not a string or object', async () => {
            const mockLogsResource = { create: vi.fn(), list: vi.fn() };
            const logger = new QuotientLogger(mockLogsResource);
            const privateLogger = logger as any;
            
            privateLogger.init({ app_name: 'test_app', environment: 'test_environment' });
            
            await expect(privateLogger.log({
                user_query: 'test',
                model_output: 'test',
                documents: [123]
            })).rejects.toThrow(ValidationError);
            
            expect(mockLogsResource.create).not.toHaveBeenCalled();
        });
        
        it('should handle unexpected errors during validation', async () => {
            const mockLogsResource = { create: vi.fn(), list: vi.fn() };
            const logger = new QuotientLogger(mockLogsResource);
            const privateLogger = logger as any;
            
            privateLogger.init({ app_name: 'test_app', environment: 'test_environment' });
            
            // Create a scenario where isValidLogDocument throws an error
            const malformedObj = Object.create(null);
            Object.defineProperty(malformedObj, 'page_content', {
                get: () => { throw new Error('Unexpected error'); }
            });
            
            await expect(privateLogger.log({
                user_query: 'test',
                model_output: 'test',
                documents: [malformedObj]
            })).rejects.toThrow(ValidationError);
            
            expect(mockLogsResource.create).not.toHaveBeenCalled();
        });
    });
    
    describe('Direct Method Testing', () => {
        it('should directly test isValidLogDocument with various inputs', () => {
            const mockLogsResource = { create: vi.fn(), list: vi.fn() };
            const logger = new QuotientLogger(mockLogsResource);
            const privateLogger = logger as any;
            
            // Valid document
            expect(privateLogger.isValidLogDocument({ page_content: 'test' })).toEqual({ valid: true });
            
            // Missing page_content
            expect(privateLogger.isValidLogDocument({})).toEqual({
                valid: false,
                error: "Missing required 'page_content' property"
            });
            
            // Non-string page_content
            expect(privateLogger.isValidLogDocument({ page_content: 123 })).toEqual({
                valid: false,
                error: "The 'page_content' property must be a string, found number"
            });
            
            // Invalid metadata
            expect(privateLogger.isValidLogDocument({ page_content: 'test', metadata: 'not-object' })).toEqual({
                valid: false,
                error: "The 'metadata' property must be an object, found string"
            });
            
            // null metadata should be valid
            expect(privateLogger.isValidLogDocument({ page_content: 'test', metadata: null })).toEqual({ valid: true });
        });
        
        it('should directly test validateDocuments with various inputs', () => {
            const mockLogsResource = { create: vi.fn(), list: vi.fn() };
            const logger = new QuotientLogger(mockLogsResource);
            const privateLogger = logger as any;
            
            // Empty array should not throw
            expect(() => privateLogger.validateDocuments([])).not.toThrow();
            
            // Null should not throw
            expect(() => privateLogger.validateDocuments(null)).not.toThrow();
            
            // Valid strings should not throw
            expect(() => privateLogger.validateDocuments(['test', 'test2'])).not.toThrow();
            
            // Valid objects should not throw
            expect(() => privateLogger.validateDocuments([
                { page_content: 'test' },
                { page_content: 'test2', metadata: { source: 'test' } }
            ])).not.toThrow();
            
            // Mixed valid types should not throw
            expect(() => privateLogger.validateDocuments([
                'test',
                { page_content: 'test' }
            ])).not.toThrow();
        });
    });
});

