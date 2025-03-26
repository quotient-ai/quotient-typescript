
import { describe, it, expect, vi } from 'vitest';
import { QuotientLogger } from '../quotientai/logger';

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


});

