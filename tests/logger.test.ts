import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuotientLogger } from '../quotientai/logger';

describe('QuotientLogger', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should initialize without being configured', () => {
    const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
    const logger = new QuotientLogger(mockLogsResource);
    const privateLogger = logger as any;
    expect(logger).toBeDefined();
    expect(privateLogger.configured).toBe(false);
    expect(privateLogger.sampleRate).toBe(1.0);
    expect(privateLogger.tags).toEqual({});
    expect(privateLogger.detections).toEqual([]);
    expect(privateLogger.detectionSampleRate).toBe(0.0);
  });

  it('should use default values when not provided', () => {
    const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
    const logger = new QuotientLogger(mockLogsResource);
    const privateLogger = logger as any;

    privateLogger.init({
      appName: 'test_app',
      environment: 'test_environment',
    });

    expect(privateLogger.sampleRate).toBe(1.0);
    expect(privateLogger.appName).toBe('test_app');
    expect(privateLogger.environment).toBe('test_environment');
    expect(privateLogger.tags).toEqual({});
    expect(privateLogger.detections).toEqual([]);
    expect(privateLogger.detectionSampleRate).toBe(0.0);
  });

  it('should initialize with the correct properties', () => {
    const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
    const logger = new QuotientLogger(mockLogsResource);
    const privateLogger = logger as any;

    privateLogger.init({
      appName: 'test_app',
      environment: 'test_environment',
      tags: { test: 'test' },
      sampleRate: 0.5,
      hallucinationDetection: true,
      inconsistencyDetection: true,
      hallucinationDetectionSampleRate: 0.5,
    });
    expect(privateLogger.appName).toBe('test_app');
    expect(privateLogger.environment).toBe('test_environment');
    expect(privateLogger.tags).toEqual({ test: 'test' });
    expect(privateLogger.sampleRate).toBe(0.5);
    // Deprecated parameters are converted to new format internally
    expect(privateLogger.detections).toEqual(['hallucination']);
    expect(privateLogger.detectionSampleRate).toBe(0.5);
    expect(privateLogger.configured).toBe(true);
  });

  it('should log error and return this if sample rate is not between 0 and 1', () => {
    const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
    const logger = new QuotientLogger(mockLogsResource);
    const privateLogger = logger as any;
    const result = privateLogger.init({ appName: 'test', environment: 'test', sampleRate: 1.5 });
    expect(result).toBe(logger);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('sampleRate must be between 0.0 and 1.0')
    );
  });

  it('should log error and return null if you attempt to log before initializing', async () => {
    const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
    const logger = new QuotientLogger(mockLogsResource);
    const privateLogger = logger as any;
    const result = await privateLogger.log({ message: 'test' });
    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Logger is not configured')
    );
    expect(mockLogsResource.create).not.toHaveBeenCalled();
  });

  it('should log a message if initialized', async () => {
    const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
    const logger = new QuotientLogger(mockLogsResource);
    const privateLogger = logger as any;
    privateLogger.init({
      appName: 'test_app',
      environment: 'test_environment',
      tags: { test: 'test' },
      sampleRate: 1.0,
    });
    await privateLogger.log({ userQuery: 'test query', modelOutput: 'test response' });
    expect(mockLogsResource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        appName: 'test_app',
        environment: 'test_environment',
        tags: { test: 'test' },
        userQuery: 'test query',
        modelOutput: 'test response',
        detections: [],
        detectionSampleRate: 0.0,
      })
    );
  });

  it('should not log a message if shouldSample returns false', async () => {
    const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
    const logger = new QuotientLogger(mockLogsResource);
    const privateLogger = logger as any;
    // Mock shouldSample to always return false
    vi.spyOn(privateLogger, 'shouldSample').mockReturnValue(false);

    privateLogger.init({
      appName: 'test_app',
      environment: 'test_environment',
      tags: { test: 'test' },
      sampleRate: 0.5,
    });
    await privateLogger.log({ message: 'test' });
    expect(mockLogsResource.create).not.toHaveBeenCalled();
  });

  it('should verify shouldSample behavior based on Math.random', () => {
    const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
    const logger = new QuotientLogger(mockLogsResource);
    const privateLogger = logger as any;
    privateLogger.init({ appName: 'test', environment: 'test', sampleRate: 0.5 });

    // Test when random is less than sample rate
    vi.spyOn(Math, 'random').mockReturnValue(0.4);
    expect(privateLogger.shouldSample()).toBe(true);

    // Test when random is greater than sample rate
    vi.spyOn(Math, 'random').mockReturnValue(0.6);
    expect(privateLogger.shouldSample()).toBe(false);

    vi.spyOn(Math, 'random').mockRestore();
  });

  it('should log error and return null if required appName or environment is missing after initialization', async () => {
    const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
    const logger = new QuotientLogger(mockLogsResource);
    const privateLogger = logger as any;

    // Initialize but with null values
    privateLogger.init({});
    privateLogger.configured = true;
    privateLogger.appName = null;
    privateLogger.environment = 'test';

    const result1 = await privateLogger.log({ message: 'test' });
    expect(result1).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('appName and environment must be set')
    );
    expect(mockLogsResource.create).not.toHaveBeenCalled();

    privateLogger.appName = 'test';
    privateLogger.environment = null;

    const result2 = await privateLogger.log({ message: 'test' });
    expect(result2).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('appName and environment must be set')
    );
    expect(mockLogsResource.create).not.toHaveBeenCalled();
  });

  describe('Document Validation', () => {
    it('should accept string documents', async () => {
      const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
      const logger = new QuotientLogger(mockLogsResource);
      const privateLogger = logger as any;

      privateLogger.init({ appName: 'test_app', environment: 'test_environment' });

      await privateLogger.log({
        userQuery: 'test',
        modelOutput: 'test',
        documents: ['This is a string document'],
      });

      expect(mockLogsResource.create).toHaveBeenCalled();
    });

    it('should accept valid LogDocument objects', async () => {
      const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
      const logger = new QuotientLogger(mockLogsResource);
      const privateLogger = logger as any;

      privateLogger.init({ appName: 'test_app', environment: 'test_environment' });

      await privateLogger.log({
        userQuery: 'test',
        modelOutput: 'test',
        documents: [
          { pageContent: 'This is valid content' },
          { pageContent: 'Also valid', metadata: { source: 'test' } },
        ],
      });

      expect(mockLogsResource.create).toHaveBeenCalled();
    });

    it('should log error and return null when document is missing pageContent', async () => {
      const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
      const logger = new QuotientLogger(mockLogsResource);
      const privateLogger = logger as any;

      privateLogger.init({ appName: 'test_app', environment: 'test_environment' });

      await privateLogger.log({
        userQuery: 'test',
        modelOutput: 'test',
        documents: [{}],
      });

      expect(mockLogsResource.create).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Missing required 'pageContent' property")
      );
    });

    it('should log error and return null when pageContent is not a string', async () => {
      const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
      const logger = new QuotientLogger(mockLogsResource);
      const privateLogger = logger as any;

      privateLogger.init({ appName: 'test_app', environment: 'test_environment' });

      await privateLogger.log({
        userQuery: 'test',
        modelOutput: 'test',
        documents: [{ pageContent: 123 }],
      });

      expect(mockLogsResource.create).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("The 'pageContent' property must be a string")
      );
    });

    it('should log error and return null when metadata is not an object', async () => {
      const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
      const logger = new QuotientLogger(mockLogsResource);
      const privateLogger = logger as any;

      privateLogger.init({ appName: 'test_app', environment: 'test_environment' });

      await privateLogger.log({
        userQuery: 'test',
        modelOutput: 'test',
        documents: [{ pageContent: 'test', metadata: 'not-object' }],
      });

      expect(mockLogsResource.create).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("The 'metadata' property must be an object")
      );
    });

    it('should accept null metadata', async () => {
      const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
      const logger = new QuotientLogger(mockLogsResource);
      const privateLogger = logger as any;

      privateLogger.init({ appName: 'test_app', environment: 'test_environment' });

      await privateLogger.log({
        userQuery: 'test',
        modelOutput: 'test',
        documents: [{ pageContent: 'test', metadata: null }],
      });

      expect(mockLogsResource.create).toHaveBeenCalled();
    });

    it('should validate documents as part of the log method', async () => {
      const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
      const logger = new QuotientLogger(mockLogsResource);
      const privateLogger = logger as any;

      privateLogger.init({ appName: 'test_app', environment: 'test_environment' });

      const validateSpy = vi.spyOn(privateLogger, 'validateDocuments');
      validateSpy.mockReturnValue(false);

      await privateLogger.log({
        userQuery: 'test',
        modelOutput: 'test',
        documents: ['test'],
      });

      expect(validateSpy).toHaveBeenCalled();
      expect(mockLogsResource.create).not.toHaveBeenCalled();
    });

    it('should skip validation if no documents are provided', async () => {
      const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
      const logger = new QuotientLogger(mockLogsResource);
      const privateLogger = logger as any;

      privateLogger.init({ appName: 'test_app', environment: 'test_environment' });

      const validateSpy = vi.spyOn(privateLogger, 'validateDocuments');

      await privateLogger.log({
        userQuery: 'test',
        modelOutput: 'test',
      });

      expect(validateSpy).not.toHaveBeenCalled();
      expect(mockLogsResource.create).toHaveBeenCalled();
    });

    it('should directly test isValidLogDocument with various inputs', () => {
      const mockLogsResource = { create: vi.fn(), list: vi.fn(), getDetections: vi.fn() };
      const logger = new QuotientLogger(mockLogsResource);
      const privateLogger = logger as any;

      // Valid document
      expect(privateLogger.isValidLogDocument({ pageContent: 'test' })).toEqual({ valid: true });

      // Missing pageContent
      expect(privateLogger.isValidLogDocument({})).toEqual({
        valid: false,
        error: "Missing required 'pageContent' property",
      });

      // pageContent not a string
      expect(privateLogger.isValidLogDocument({ pageContent: 123 })).toEqual({
        valid: false,
        error: "The 'pageContent' property must be a string, found number",
      });

      // metadata not an object
      expect(
        privateLogger.isValidLogDocument({ pageContent: 'test', metadata: 'not-object' })
      ).toEqual({
        valid: false,
        error: "The 'metadata' property must be an object, found string",
      });

      // null metadata is valid
      expect(privateLogger.isValidLogDocument({ pageContent: 'test', metadata: null })).toEqual({
        valid: true,
      });
    });
  });
});
