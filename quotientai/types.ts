import { BaseQuotientClient } from './client';

export interface TokenData {
  token: string;
  expires_at: number;
}

export interface AuthResponse {
  token: string;
  expires_at: number;
}

export interface BaseResource {
  client: BaseQuotientClient;
}

export interface Prompt {
  id: string;
  name: string;
  content: string;
  version: number;
  user_prompt: string;
  created_at: Date;
  updated_at: Date;
  system_prompt?: string;
}

export interface ModelProvider {
  id: string;
  name: string;
}

export interface Model {
  id: string;
  name: string;
  provider: ModelProvider;
  created_at: Date;
}

export interface Dataset {
  id: string;
  name: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  description?: string;
  rows?: DatasetRow[];

}

export interface DatasetRowMetadata {
  annotation?: string;
  annotation_note?: string
}

export interface DatasetRow {
  id: string;
  input: string;
  context?: string;
  expected?: string;
  metadata: DatasetRowMetadata;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface RunResult {
  id: string;
  input: string;
  output: string;
  values: Record<string, any>; 
  created_at: Date;
  created_by: string;
  context: string;
  expected: string;
}

export interface LogEntry {
  app_name: string;
  environment: string;
  user_query: string;
  model_output: string;
  documents: string[];
  message_history?: Array<Record<string, any>> | null; 
  instructions?: string[] | null;
  tags?: Record<string, any>; 
  hallucination_detection: boolean;
  inconsistency_detection: boolean;
  hallucination_detection_sample_rate?: number;
}

export interface LoggerConfig {
  app_name: string;
  environment: string;
  tags?: Record<string, any>; 
  sample_rate?: number;
  hallucination_detection?: boolean;
  inconsistency_detection?: boolean;
  hallucination_detection_sample_rate?: number;
}

export interface QuotientAIError extends Error {
  status?: number;
  code?: string;
} 