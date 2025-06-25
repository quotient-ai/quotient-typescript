import {
  LogEntry,
  LoggerConfig,
  LogDocument,
  LOG_STATUS,
  DetectionResults,
  DetectionType,
} from './types';
import { ValidationError, logError } from './exceptions';
import { v4 as uuidv4 } from 'uuid';

interface LogsResource {
  create(params: any): Promise<any>;
  list(): Promise<LogEntry[]>;
  getDetections(logId: string): Promise<any>;
}

export class QuotientLogger {
  private appName: string | null = null;
  private environment: string | null = null;
  private tags: Record<string, any> = {};
  private sampleRate: number = 1.0;
  private configured: boolean = false;
  private logsResource: LogsResource;

  // New detection parameters (recommended)
  private detections: DetectionType[] = [];
  private detectionSampleRate: number = 0.0;

  constructor(logsResource: LogsResource) {
    this.logsResource = logsResource;
  }

  init(config: LoggerConfig): QuotientLogger {
    if (!config.appName || typeof config.appName !== 'string') {
      logError(new Error('appName must be a non-empty string'));
      return this;
    }
    if (!config.environment || typeof config.environment !== 'string') {
      logError(new Error('environment must be a non-empty string'));
      return this;
    }
    if (config.tags && typeof config.tags !== 'object') {
      logError(new Error('tags must be a dictionary'));
      return this;
    }
    if (config.sampleRate && typeof config.sampleRate !== 'number') {
      logError(new Error('sampleRate must be a number'));
      return this;
    }

    // Check for deprecated vs new detection parameter usage
    const deprecatedDetectionParamsUsed = [
      config.hallucinationDetection !== undefined,
      config.inconsistencyDetection !== undefined,
      config.hallucinationDetectionSampleRate !== undefined,
    ].some(Boolean);

    const detectionParamsUsed = [
      config.detections !== undefined,
      config.detectionSampleRate !== undefined,
    ].some(Boolean);

    // Prevent mixing deprecated and new detection parameters
    if (deprecatedDetectionParamsUsed && detectionParamsUsed) {
      logError(
        new Error(
          'Cannot mix deprecated parameters (hallucinationDetection, inconsistencyDetection, hallucinationDetectionSampleRate) ' +
            'with new detection parameters (detections, detectionSampleRate) in logger.init(). Please use new detection parameters.'
        )
      );
      return this;
    }

    // Handle deprecated parameters (with deprecation warnings)
    if (deprecatedDetectionParamsUsed) {
      console.warn(
        'Deprecated parameters (hallucinationDetection, inconsistencyDetection, hallucinationDetectionSampleRate) ' +
          'are deprecated as of 0.3.4. Please use new detection parameters (detections, detectionSampleRate) instead.'
      );

      // Convert deprecated to new format
      const detections: DetectionType[] = [];
      if (config.hallucinationDetection) {
        detections.push(DetectionType.HALLUCINATION);
      }
      // Note: inconsistencyDetection is deprecated and not supported in v2

      const detectionSampleRate = config.hallucinationDetectionSampleRate || 0.0;

      this.detections = detections;
      this.detectionSampleRate = detectionSampleRate;
    } else {
      // Use new detection parameters
      this.detections = config.detections || [];
      this.detectionSampleRate = config.detectionSampleRate || 0.0;
    }

    this.appName = config.appName;
    this.environment = config.environment;
    this.tags = config.tags || {};
    this.sampleRate = config.sampleRate || 1.0;

    if (this.sampleRate < 0 || this.sampleRate > 1) {
      logError(new Error('sampleRate must be between 0.0 and 1.0'));
      return this;
    }

    if (this.detectionSampleRate < 0 || this.detectionSampleRate > 1) {
      logError(new Error('detectionSampleRate must be between 0.0 and 1.0'));
      return this;
    }

    this.configured = true;

    return this;
  }

  private shouldSample(): boolean {
    return Math.random() < this.sampleRate;
  }

  // Type guard function to check if an object is a valid LogDocument
  private isValidLogDocument(obj: any): { valid: boolean; error?: string } {
    try {
      // Check if it has the required pageContent property
      if (!('pageContent' in obj)) {
        return {
          valid: false,
          error: "Missing required 'pageContent' property",
        };
      }

      // Check if pageContent is a string
      if (typeof obj.pageContent !== 'string') {
        return {
          valid: false,
          error: `The 'pageContent' property must be a string, found ${typeof obj.pageContent}`,
        };
      }

      // If metadata exists, check if it's an object
      if ('metadata' in obj && obj.metadata !== null && typeof obj.metadata !== 'object') {
        return {
          valid: false,
          error: `The 'metadata' property must be an object, found ${typeof obj.metadata}`,
        };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Unexpected error validating document' };
    }
  }

  // Validate document format
  private validateDocuments(documents: (string | LogDocument)[]): boolean {
    if (!documents || documents.length === 0) {
      return true;
    }

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      if (typeof doc === 'string') {
        continue;
      } else if (typeof doc === 'object' && doc !== null) {
        const validation = this.isValidLogDocument(doc);
        if (!validation.valid) {
          logError(
            new ValidationError(
              `Invalid document format at index ${i}: ${validation.error}. ` +
                "Documents must be either strings or JSON objects with a 'pageContent' string property and an optional 'metadata' object. " +
                "To fix this, ensure each document follows the format: { pageContent: 'your text content', metadata?: { key: 'value' } }"
            )
          );
          return false;
        }
      } else {
        logError(
          new ValidationError(
            `Invalid document type at index ${i}. Found ${typeof doc}, but documents must be either strings or JSON objects with a 'pageContent' property. ` +
              "To fix this, provide documents as either simple strings or properly formatted objects: { pageContent: 'your text content' }"
          )
        );
        return false;
      }
    }
    return true;
  }

  // log a message
  async _internalLog(params: Omit<LogEntry, 'appName' | 'environment'>): Promise<any> {
    if (!this.configured) {
      logError(new Error('Logger is not configured. Please call init() before logging.'));
      return null;
    }

    if (!this.appName || !this.environment) {
      logError(
        new Error('Logger is not properly configured. appName and environment must be set.')
      );
      return null;
    }

    // Check for deprecated vs new detection parameter usage
    const deprecatedDetectionParamsUsed = [
      params.hallucinationDetection !== undefined,
      params.inconsistencyDetection !== undefined,
    ].some(Boolean);

    const detectionParamsUsed = [
      params.detections !== undefined,
      params.detectionSampleRate !== undefined,
    ].some(Boolean);

    // Prevent mixing deprecated and new detection parameters
    if (deprecatedDetectionParamsUsed && detectionParamsUsed) {
      logError(
        new Error(
          'Cannot mix deprecated parameters (hallucinationDetection, inconsistencyDetection) ' +
            'with new detection parameters (detections, detectionSampleRate). Please use new detection parameters.'
        )
      );
      return null;
    }

    let detections: DetectionType[];
    let detectionSampleRate: number;

    // Handle deprecated parameters (with deprecation warnings)
    if (deprecatedDetectionParamsUsed) {
      console.warn(
        'Deprecated parameters (hallucinationDetection, inconsistencyDetection) ' +
          'are deprecated as of 0.3.4. Please use new detection parameters (detections, detectionSampleRate) instead. Document relevancy is not available with deprecated parameters.'
      );

      // Convert deprecated to new format
      detections = [];
      if (params.hallucinationDetection) {
        detections.push(DetectionType.HALLUCINATION);
      }

      detectionSampleRate = this.detectionSampleRate || 0.0;

      // For backward compatibility, require userQuery and modelOutput
      if (!params.userQuery || !params.modelOutput) {
        logError(
          new Error('userQuery and modelOutput are required when using deprecated parameters')
        );
        return null;
      }
    } else {
      // Use new detection parameters or defaults from logger config
      detections = params.detections !== undefined ? params.detections : this.detections;
      detectionSampleRate =
        params.detectionSampleRate !== undefined
          ? params.detectionSampleRate
          : this.detectionSampleRate;

      // Validate detectionSampleRate
      if (detectionSampleRate < 0 || detectionSampleRate > 1) {
        logError(new Error('detectionSampleRate must be between 0 and 1'));
        return null;
      }

      // Validate required fields based on selected detections
      for (const detection of detections) {
        if (detection === DetectionType.HALLUCINATION) {
          if (!params.userQuery) {
            logError(new Error('userQuery is required when hallucination detection is enabled'));
            return null;
          }
          if (!params.modelOutput) {
            logError(new Error('modelOutput is required when hallucination detection is enabled'));
            return null;
          }
          if (!params.documents && !params.messageHistory && !params.instructions) {
            logError(
              new Error(
                'At least one of documents, messageHistory, or instructions must be provided when hallucination detection is enabled'
              )
            );
            return null;
          }
        } else if (detection === DetectionType.DOCUMENT_RELEVANCY) {
          if (!params.userQuery) {
            logError(
              new Error('userQuery is required when document_relevancy detection is enabled')
            );
            return null;
          }
          if (!params.documents) {
            logError(
              new Error('documents must be provided when document_relevancy detection is enabled')
            );
            return null;
          }
        }
      }
    }

    // Validate documents format
    if (params.documents) {
      const isValid = this.validateDocuments(params.documents);
      if (!isValid) {
        return null;
      }
    }

    // Merge default tags with any tags provided at log time
    const mergedTags = { ...this.tags, ...(params.tags || {}) };

    if (this.shouldSample()) {
      // Convert DetectionType enums to strings for the resources layer
      const detectionStrings = detections.map((detection) => detection.valueOf());

      // generate a random id
      const id = uuidv4();
      // generate UTC timestamp string
      const createdAt = new Date().toISOString();
      await this.logsResource.create({
        id: id,
        createdAt: createdAt,
        appName: this.appName,
        environment: this.environment,
        userQuery: params.userQuery,
        modelOutput: params.modelOutput,
        documents: params.documents,
        messageHistory: params.messageHistory,
        instructions: params.instructions,
        tags: mergedTags,
        // Only new detection parameters (deprecated params converted above)
        detections: detectionStrings,
        detectionSampleRate: detectionSampleRate,
      });

      return id;
    }
  }

  // poll for detection results using log id
  async _internalPollForDetection(
    logId: string,
    timeout: number = 300,
    pollInterval: number = 2.0
  ): Promise<DetectionResults | null> {
    if (!this.configured) {
      logError(
        new Error(
          'Logger is not configured. Please call init() before polling for detection results.'
        )
      );
      return null;
    }

    if (!logId) {
      logError(new Error('Log ID is required for detection polling.'));
      return null;
    }

    const startTime = Date.now();
    const timeoutMs = timeout * 1000; // Convert timeout to milliseconds
    let currentPollInterval = pollInterval * 1000; // Convert poll interval to milliseconds
    const baseInterval = pollInterval * 1000; // Keep track of the base interval

    while (Date.now() - startTime < timeoutMs) {
      try {
        const results = await this.logsResource.getDetections(logId);

        // Reset interval on successful response
        currentPollInterval = baseInterval;

        if (results && results.log) {
          const status = results.log.status;

          // Check if we're in a final state
          if (
            status === LOG_STATUS.LOG_CREATED_NO_DETECTIONS_PENDING ||
            status === LOG_STATUS.LOG_CREATED_AND_DETECTION_COMPLETED
          ) {
            return results;
          }
        }

        // Wait for poll interval before trying again
        await new Promise((resolve) => setTimeout(resolve, currentPollInterval));
      } catch (error) {
        // Handle event loop errors specifically
        if (error instanceof Error && error.message.includes('Event loop is closed')) {
          await new Promise((resolve) => setTimeout(resolve, currentPollInterval));
          continue;
        }
        await new Promise((resolve) => setTimeout(resolve, currentPollInterval));
      }
    }

    logError(new Error(`Timed out waiting for detection results after ${timeout} seconds`));
    return null;
  }

  // log a message
  async log(params: Omit<LogEntry, 'appName' | 'environment'>): Promise<any> {
    // Add deprecation warning
    console.warn(
      'quotient.logger.log() is deprecated as of 0.0.9 and will be removed in a future version. ' +
        'Please use quotient.log() instead.'
    );

    return this._internalLog(params);
  }

  // poll for detection results using log id
  async pollForDetection(
    logId: string,
    timeout: number = 300,
    pollInterval: number = 2.0
  ): Promise<DetectionResults | null> {
    // Add deprecation warning
    console.warn(
      'quotient.logger.poll_for_detection() is deprecated as of 0.0.9 and will be removed in a future version. ' +
        'Please use quotient.poll_for_detections() instead.'
    );

    return this._internalPollForDetection(logId, timeout, pollInterval);
  }
}
