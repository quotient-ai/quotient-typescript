import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuotientLogger } from '../quotientai/logger';
import { DetectionType } from '../quotientai/types';

describe('Deprecation Warnings', () => {
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;
  let mockLogsResource: any;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockLogsResource = {
      create: vi.fn().mockResolvedValue('test-log-id'),
      list: vi.fn(),
      getDetections: vi.fn(),
    };
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Logger Init Deprecation Warnings', () => {
    it('should trigger deprecation warning when using deprecated parameters in logger.init()', () => {
      const logger = new QuotientLogger(mockLogsResource);

      logger.init({
        appName: 'test-app',
        environment: 'test',
        hallucinationDetection: true,
        hallucinationDetectionSampleRate: 0.8,
      });

      // Verify warning was triggered
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Deprecated parameters (hallucinationDetection, inconsistencyDetection, hallucinationDetectionSampleRate)'
        )
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('are deprecated as of 0.0.9')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Please use new detection parameters (detections, detectionSampleRate) instead'
        )
      );

      // Verify logger was still configured correctly
      const privateLogger = logger as any;
      expect(privateLogger.configured).toBe(true);
      expect(privateLogger.detections).toEqual([DetectionType.HALLUCINATION]);
      expect(privateLogger.detectionSampleRate).toBe(0.8);
    });

    it('should handle inconsistencyDetection parameter (but not support it in v2)', () => {
      const logger = new QuotientLogger(mockLogsResource);

      logger.init({
        appName: 'test-app',
        environment: 'test',
        hallucinationDetection: true,
        inconsistencyDetection: true, // This should be ignored in v2
        hallucinationDetectionSampleRate: 0.5,
      });

      // Verify warning was triggered
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Deprecated parameters'));

      // Verify inconsistency detection is not included (not supported in v2)
      const privateLogger = logger as any;
      expect(privateLogger.detections).toEqual([DetectionType.HALLUCINATION]);
      expect(privateLogger.detections).toHaveLength(1); // Only hallucination, not inconsistency
    });

    it('should fail when mixing deprecated and new parameters in logger.init()', () => {
      const logger = new QuotientLogger(mockLogsResource);

      const result = logger.init({
        appName: 'test-app',
        environment: 'test',
        // Mix old and new parameters
        hallucinationDetection: true,
        detections: [DetectionType.DOCUMENT_RELEVANCY],
        detectionSampleRate: 1.0,
      });

      // Should return logger but not be configured, and log error
      expect(result).toBe(logger);
      const privateLogger = logger as any;
      expect(privateLogger.configured).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot mix deprecated parameters')
      );
    });

    it('should work without warnings when using new parameters', () => {
      const logger = new QuotientLogger(mockLogsResource);

      logger.init({
        appName: 'test-app',
        environment: 'test',
        detections: [DetectionType.HALLUCINATION, DetectionType.DOCUMENT_RELEVANCY],
        detectionSampleRate: 1.0,
      });

      // No warnings should be triggered
      expect(consoleWarnSpy).not.toHaveBeenCalled();

      // Verify logger was configured correctly
      const privateLogger = logger as any;
      expect(privateLogger.configured).toBe(true);
      expect(privateLogger.detections).toEqual([
        DetectionType.HALLUCINATION,
        DetectionType.DOCUMENT_RELEVANCY,
      ]);
      expect(privateLogger.detectionSampleRate).toBe(1.0);
    });
  });

  describe('Logger Log Method Deprecation Warnings', () => {
    it('should trigger deprecation warning when using deprecated parameters in _internalLog()', async () => {
      const logger = new QuotientLogger(mockLogsResource);

      // Initialize logger without detection parameters
      logger.init({
        appName: 'test-app',
        environment: 'test',
      });

      const logId = await logger._internalLog({
        userQuery: 'Test query',
        modelOutput: 'Test output',
        documents: ['Test document'],
        hallucinationDetection: true,
      });

      // Verify warning was triggered
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Deprecated parameters (hallucinationDetection, inconsistencyDetection)'
        )
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('are deprecated as of 0.0.9')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Document relevancy is not available with deprecated parameters')
      );

      // Verify log was still created (should be a UUID)
      expect(logId).toBeTruthy();
      expect(typeof logId).toBe('string');
      expect(mockLogsResource.create).toHaveBeenCalled();
    });

    it('should fail when mixing deprecated and new parameters in _internalLog()', async () => {
      const logger = new QuotientLogger(mockLogsResource);

      // Initialize logger with new parameters
      logger.init({
        appName: 'test-app',
        environment: 'test',
        detections: [DetectionType.HALLUCINATION],
        detectionSampleRate: 1.0,
      });

      const logId = await logger._internalLog({
        userQuery: 'Test query',
        modelOutput: 'Test output',
        documents: ['Test document'],
        // Mix new and old parameters
        detections: [DetectionType.DOCUMENT_RELEVANCY],
        hallucinationDetection: true,
      });

      // Should return null (failure) and log error
      expect(logId).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot mix deprecated parameters')
      );
      expect(mockLogsResource.create).not.toHaveBeenCalled();
    });

    it('should require userQuery and modelOutput when using deprecated parameters', async () => {
      const logger = new QuotientLogger(mockLogsResource);

      logger.init({
        appName: 'test-app',
        environment: 'test',
      });

      // Test without userQuery
      let logId = await logger._internalLog({
        // userQuery missing
        modelOutput: 'Test output',
        documents: ['Test document'],
        hallucinationDetection: true,
      });

      expect(logId).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'userQuery and modelOutput are required when using deprecated parameters'
        )
      );

      // Clear mocks
      consoleErrorSpy.mockClear();

      // Test without modelOutput
      logId = await logger._internalLog({
        userQuery: 'Test query',
        // modelOutput missing
        documents: ['Test document'],
        hallucinationDetection: true,
      });

      expect(logId).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'userQuery and modelOutput are required when using deprecated parameters'
        )
      );
    });

    it('should work without warnings when using new parameters', async () => {
      const logger = new QuotientLogger(mockLogsResource);

      logger.init({
        appName: 'test-app',
        environment: 'test',
        detections: [DetectionType.HALLUCINATION, DetectionType.DOCUMENT_RELEVANCY],
        detectionSampleRate: 1.0,
      });

      const logId = await logger._internalLog({
        userQuery: 'Test query',
        modelOutput: 'Test output',
        documents: ['Test document'],
      });

      // No warnings should be triggered
      expect(consoleWarnSpy).not.toHaveBeenCalled();

      // Verify log was created (should be a UUID)
      expect(logId).toBeTruthy();
      expect(typeof logId).toBe('string');
      expect(mockLogsResource.create).toHaveBeenCalled();
    });
  });

  describe('Deprecation Warning Message Content', () => {
    it('should contain expected content in logger.init() warning messages', () => {
      const logger = new QuotientLogger(mockLogsResource);

      logger.init({
        appName: 'test-app',
        environment: 'test',
        hallucinationDetection: true,
        inconsistencyDetection: true,
        hallucinationDetectionSampleRate: 0.5,
      });

      const warningCall = consoleWarnSpy.mock.calls[0][0];

      // Check for specific deprecated parameter names
      expect(warningCall).toContain('hallucinationDetection');
      expect(warningCall).toContain('inconsistencyDetection');
      expect(warningCall).toContain('hallucinationDetectionSampleRate');

      // Check for new parameter suggestions
      expect(warningCall).toContain('detections');
      expect(warningCall).toContain('detectionSampleRate');

      // Check for version information
      expect(warningCall).toContain('0.0.9');
    });

    it('should contain expected content in _internalLog() warning messages', async () => {
      const logger = new QuotientLogger(mockLogsResource);

      logger.init({
        appName: 'test-app',
        environment: 'test',
      });

      await logger._internalLog({
        userQuery: 'Test query',
        modelOutput: 'Test output',
        documents: ['Test document'],
        hallucinationDetection: true,
        inconsistencyDetection: true,
      });

      const warningCall = consoleWarnSpy.mock.calls[0][0];

      // Check for document relevancy limitation message
      expect(warningCall).toContain(
        'Document relevancy is not available with deprecated parameters'
      );

      // Check for version and parameter information
      expect(warningCall).toContain('0.0.9');
      expect(warningCall).toContain('deprecated');
    });
  });

  describe('Legacy Logger Method Deprecation Warnings', () => {
    it('should trigger deprecation warning for logger.log() method', async () => {
      const logger = new QuotientLogger(mockLogsResource);

      logger.init({
        appName: 'test-app',
        environment: 'test',
      });

      await logger.log({
        userQuery: 'Test query',
        modelOutput: 'Test output',
      });

      // Verify warning was triggered for the deprecated method
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('quotient.logger.log() is deprecated as of 0.0.9')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please use quotient.log() instead')
      );
    });

    it('should trigger deprecation warning for logger.pollForDetection() method', async () => {
      const logger = new QuotientLogger(mockLogsResource);

      logger.init({
        appName: 'test-app',
        environment: 'test',
      });

      mockLogsResource.getDetections.mockResolvedValue({
        log: { status: 'log_created_no_detections_pending' },
      });

      await logger.pollForDetection('test-log-id', 1, 0.1);

      // Verify warning was triggered for the deprecated method
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('quotient.logger.poll_for_detection() is deprecated as of 0.0.9')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please use quotient.poll_for_detections() instead')
      );
    });
  });

  describe('Parameter Validation with Deprecated Parameters', () => {
    it('should validate hallucination detection requirements with deprecated parameters', async () => {
      const logger = new QuotientLogger(mockLogsResource);

      logger.init({
        appName: 'test-app',
        environment: 'test',
      });

      // Test without required fields for hallucination detection
      const logId = await logger._internalLog({
        userQuery: 'Test query',
        // Missing modelOutput, documents, messageHistory, and instructions
        hallucinationDetection: true,
      });

      expect(logId).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'userQuery and modelOutput are required when using deprecated parameters'
        )
      );
    });

    it('should validate new parameter requirements without warnings', async () => {
      const logger = new QuotientLogger(mockLogsResource);

      logger.init({
        appName: 'test-app',
        environment: 'test',
        detections: [DetectionType.HALLUCINATION],
        detectionSampleRate: 1.0,
      });

      // Test without required fields for hallucination detection
      const logId = await logger._internalLog({
        // Missing userQuery
        modelOutput: 'Test output',
        documents: ['Test document'],
      });

      expect(logId).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('userQuery is required when hallucination detection is enabled')
      );

      // No deprecation warnings should be triggered
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});
