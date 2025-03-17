import { LogEntry, LoggerConfig } from './types';

export class QuotientLogger {
  private appName: string | null = null;
  private environment: string | null = null;
  private tags: Record<string, any> = {};
  private sampleRate: number = 1.0;
  private hallucinationDetection: boolean = false;
  private inconsistencyDetection: boolean = false;
  private configured: boolean = false;
  private hallucinationDetectionSampleRate: number = 0.0;
  private logsResource: any; // Replace with proper type when implementing LogsResource

  constructor(logsResource: any) {
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

  async log(params: Omit<LogEntry, 'app_name' | 'environment'>): Promise<void> {
    if (!this.configured) {
      throw new Error('Logger is not configured. Please call init() before logging.');
    }

    // Merge default tags with any tags provided at log time
    const mergedTags = { ...this.tags, ...(params.tags || {}) };

    // Use instance variables as defaults if not provided
    const hallucinationDetection = params.hallucination_detection ?? this.hallucinationDetection;
    const inconsistencyDetection = params.inconsistency_detection ?? this.inconsistencyDetection;

    if (this.shouldSample()) {
      await this.logsResource.create({
        ...params,
        app_name: this.appName,
        environment: this.environment,
        tags: mergedTags,
        hallucination_detection: hallucinationDetection,
        inconsistency_detection: inconsistencyDetection,
        hallucination_detection_sample_rate: this.hallucinationDetectionSampleRate,
      });
    }
  }
} 