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
  private isValidLogDocument(obj: any): obj is LogDocument {
    try {
      // Check if it has the required page_content property and it's a string
      if (!('page_content' in obj) || typeof obj.page_content !== 'string') {
        return false;
      }
      
      // If metadata exists, check if it's an object
      if ('metadata' in obj && obj.metadata !== null && typeof obj.metadata !== 'object') {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // Validate document format
  private validateDocuments(documents: (string | LogDocument)[]): void {
    if (!documents || documents.length === 0) {
      return;
    }

    for (const doc of documents) {
      if (typeof doc === 'string') {
        continue;
      } else if (typeof doc === 'object' && doc !== null) {
        if (!this.isValidLogDocument(doc)) {
          throw new ValidationError("Documents must be a list of strings or dictionaries with 'page_content' and optional 'metadata' keys. Metadata keys must be strings");
        }
      } else {
        throw new ValidationError(`Documents must be a list of strings or dictionaries with 'page_content' and optional 'metadata' keys, got ${typeof doc}`);
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

    try {
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
    } catch (error) {
      throw error;
    }
  }
} 