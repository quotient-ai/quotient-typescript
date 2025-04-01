import { LogEntry, LoggerConfig, LogDocument } from './types';
import { ValidationError } from './exceptions';

interface LogsResource {
  create(params: LogEntry): Promise<any>;
  list(): Promise<LogEntry[]>;
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
    this.appName = config.app_name;
    this.environment = config.environment;
    this.tags = config.tags || {};
    this.sampleRate = config.sample_rate || 1.0;
    this.hallucinationDetection = config.hallucination_detection || false;
    this.inconsistencyDetection = config.inconsistency_detection || false;
    this.hallucinationDetectionSampleRate = config.hallucination_detection_sample_rate || 0.0;
    this.configured = true;

    if (this.sampleRate < 0 || this.sampleRate > 1) {
      throw new Error('sample_rate must be between 0.0 and 1.0');
    }

    return this;
  }

  private shouldSample(): boolean {
    return Math.random() < this.sampleRate;
  }

  // Type guard function to check if an object is a valid LogDocument
  private isValidLogDocument(obj: any): { valid: boolean; error?: string } {
    try {
      // Check if it has the required page_content property
      if (!('page_content' in obj)) {
        return { 
          valid: false, 
          error: "Missing required 'page_content' property" 
        };
      }
      
      // Check if page_content is a string
      if (typeof obj.page_content !== 'string') {
        return { 
          valid: false, 
          error: `The 'page_content' property must be a string, found ${typeof obj.page_content}` 
        };
      }
      
      // If metadata exists, check if it's an object
      if ('metadata' in obj && obj.metadata !== null && typeof obj.metadata !== 'object') {
        return { 
          valid: false, 
          error: `The 'metadata' property must be an object, found ${typeof obj.metadata}` 
        };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: "Unexpected error validating document" };
    }
  }

  // Validate document format
  private validateDocuments(documents: (string | LogDocument)[]): void {
    if (!documents || documents.length === 0) {
      return;
    }

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      if (typeof doc === 'string') {
        continue;
      } else if (typeof doc === 'object' && doc !== null) {
        const validation = this.isValidLogDocument(doc);
        if (!validation.valid) {
          throw new ValidationError(
            `Invalid document format at index ${i}: ${validation.error}. ` +
            "Documents must be either strings or JSON objects with a 'page_content' string property and an optional 'metadata' object. " +
            "To fix this, ensure each document follows the format: { page_content: 'your text content', metadata?: { key: 'value' } }"
          );
        }
      } else {
        throw new ValidationError(
          `Invalid document type at index ${i}. Found ${typeof doc}, but documents must be either strings or JSON objects with a 'page_content' property. ` +
          "To fix this, provide documents as either simple strings or properly formatted objects: { page_content: 'your text content' }"
        );
      }
    }
  }

  // log a message
  // params: Omit<LogEntry, 'app_name' | 'environment'>
  async log(params: Omit<LogEntry, 'app_name' | 'environment'>): Promise<any> {
    if (!this.configured) {
      throw new Error('Logger is not configured. Please call init() before logging.');
    }

    if (!this.appName || !this.environment) {
      throw new Error('Logger is not properly configured. app_name and environment must be set.');
    }

    // Validate documents format
    if (params.documents) {
      this.validateDocuments(params.documents);
    }

    // Merge default tags with any tags provided at log time
    const mergedTags = { ...this.tags, ...(params.tags || {}) };

    // Use instance variables as defaults if not provided
    const hallucinationDetection = params.hallucination_detection ?? this.hallucinationDetection;
    const inconsistencyDetection = params.inconsistency_detection ?? this.inconsistencyDetection;

    if (this.shouldSample()) {
      const response = await this.logsResource.create({
        ...params,
        app_name: this.appName,
        environment: this.environment,
        tags: mergedTags,
        hallucination_detection: hallucinationDetection,
        inconsistency_detection: inconsistencyDetection,
        hallucination_detection_sample_rate: this.hallucinationDetectionSampleRate,
      });

      return response;
    }
  }
} 