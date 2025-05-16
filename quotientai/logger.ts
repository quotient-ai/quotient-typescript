import { LogEntry, LoggerConfig, LogDocument, LOG_STATUS, DetectionResults } from './types';
import { ValidationError, logError } from './exceptions';
import { v4 as uuidv4 } from 'uuid';
interface LogsResource {
  create(params: LogEntry): Promise<any>;
  list(): Promise<LogEntry[]>;
  getDetections(logId: string): Promise<any>;
}

export class QuotientLogger {
  private appName: string | null = null;
  private environment: string | null = null;
  private tags: Record<string, any> = {};
  private sampleRate: number = 1.0;
  private hallucinationDetection: boolean = false;
  private inconsistencyDetection: boolean = false;
  private configured: boolean = false;
  private hallucinationDetectionSampleRate: number = 0.0;
  private logsResource: LogsResource;

  constructor(logsResource: LogsResource) {
    this.logsResource = logsResource;
  }

  init(config: LoggerConfig): QuotientLogger {
    this.appName = config.appName;
    this.environment = config.environment;
    this.tags = config.tags || {};
    this.sampleRate = config.sampleRate || 1.0;
    this.hallucinationDetection = config.hallucinationDetection || false;
    this.inconsistencyDetection = config.inconsistencyDetection || false;
    this.hallucinationDetectionSampleRate = config.hallucinationDetectionSampleRate || 0.0;
    this.configured = true;

    if (this.sampleRate < 0 || this.sampleRate > 1) {
      logError(new Error('sampleRate must be between 0.0 and 1.0'));
      return this;
    }

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
  async log(params: Omit<LogEntry, 'appName' | 'environment'>): Promise<any> {
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

    // Validate documents format
    if (params.documents) {
      const isValid = this.validateDocuments(params.documents);
      if (!isValid) {
        return null;
      }
    }

    // Merge default tags with any tags provided at log time
    const mergedTags = { ...this.tags, ...(params.tags || {}) };

    // Use instance variables as defaults if not provided
    const hallucinationDetection = params.hallucinationDetection ?? this.hallucinationDetection;
    const inconsistencyDetection = params.inconsistencyDetection ?? this.inconsistencyDetection;

    if (this.shouldSample()) {
      // generate a random id
      const id = uuidv4();
      // generate iso string for createdAt
      const createdAt = new Date().toISOString();
      await this.logsResource.create({
        ...params,
        id: id,
        createdAt: createdAt,
        appName: this.appName,
        environment: this.environment,
        tags: mergedTags,
        hallucinationDetection: hallucinationDetection,
        inconsistencyDetection: inconsistencyDetection,
        hallucinationDetectionSampleRate: this.hallucinationDetectionSampleRate,
      });

      return id;
    }
  }

  // poll for detection results using log id
  async pollForDetection(
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
}
