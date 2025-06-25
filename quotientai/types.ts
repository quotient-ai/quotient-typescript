import { BaseQuotientClient } from './client';

export interface TokenData {
  token: string;
  expires_at: number;
  api_key: string;
}

export interface AuthResponse {
  token: string;
  expires_at: number;
}

export interface BaseResource {
  client: BaseQuotientClient;
}

export interface LogDocument {
  pageContent: string;
  metadata?: Record<string, any>;
}

export enum DetectionType {
  HALLUCINATION = 'hallucination',
  DOCUMENT_RELEVANCY = 'document_relevancy',
}

export interface LogEntry {
  id?: string;
  createdAt?: string | Date;
  appName: string;
  environment: string;
  // Common input parameters (optional, validated based on detection types)
  userQuery?: string;
  modelOutput?: string;
  documents?: (string | LogDocument)[];
  messageHistory?: Array<Record<string, any>> | null;
  instructions?: string[] | null;
  tags?: Record<string, any>;
  // New detection parameters (recommended)
  detections?: DetectionType[];
  detectionSampleRate?: number;
  // Deprecated detection parameters
  /** @deprecated in 0.3.4 - Use detections=[DetectionType.HALLUCINATION] instead */
  hallucinationDetection?: boolean;
  /** @deprecated in 0.3.4 - Use detectionSampleRate instead */
  hallucinationDetectionSampleRate?: number;
  /** @deprecated in 0.3.4 - Use detections=[DetectionType.INCONSISTENCY] instead */
  inconsistencyDetection?: boolean;
}

export interface LoggerConfig {
  id?: string;
  createdAt?: string | Date;
  appName: string;
  environment: string;
  tags?: Record<string, any>;
  sampleRate?: number;
  // New detection parameters (recommended)
  detections?: DetectionType[];
  detectionSampleRate?: number;
  // Deprecated detection parameters
  /** @deprecated in 0.3.4 - Use detections=[DetectionType.HALLUCINATION] instead */
  hallucinationDetection?: boolean;
  /** @deprecated in 0.3.4 - Use detections=[DetectionType.INCONSISTENCY] instead */
  inconsistencyDetection?: boolean;
  /** @deprecated in 0.3.4 - Use detectionSampleRate instead */
  hallucinationDetectionSampleRate?: number;
}

export enum LOG_STATUS {
  LOG_NOT_FOUND = 'log_not_found',
  LOG_CREATION_IN_PROGRESS = 'log_creation_in_progress',
  LOG_CREATED_NO_DETECTIONS_PENDING = 'log_created_no_detections_pending',
  LOG_CREATED_AND_DETECTION_IN_PROGRESS = 'log_created_and_detection_in_progress',
  LOG_CREATED_AND_DETECTION_COMPLETED = 'log_created_and_detection_completed',
}

export enum EVALUATION_SCORE {
  PASS = 'PASS',
  FAIL = 'FAIL',
  INCONCLUSIVE = 'INCONCLUSIVE',
}

export interface QuotientAIError extends Error {
  status?: number;
  code?: string;
}

// Common evaluation properties - API Response format (snake_case)
export interface BaseEvaluationResponse {
  id: string;
  evaluation_id: string;
  reasoning: string;
  score: EVALUATION_SCORE;
  index: number;
  created_at: string;
  updated_at: string;
}

// Snake case interfaces - API Response format
export interface DocumentEvaluationResponse extends BaseEvaluationResponse {
  log_document_id: string;
}

export interface MessageHistoryEvaluationResponse extends BaseEvaluationResponse {
  log_message_history_id: string;
}

export interface InstructionEvaluationResponse extends BaseEvaluationResponse {
  log_instruction_id: string;
}

export interface FullDocContextEvaluationResponse extends BaseEvaluationResponse {
  log_document_ids: string[];
}

export interface EvaluationResponse {
  id: string;
  sentence: string;
  supporting_document_ids: string[];
  supporting_message_history_ids: string[];
  supporting_instruction_ids: string[];
  is_hallucinated: boolean;
  full_doc_context_has_hallucination: boolean;
  index: number;
  document_evaluations: DocumentEvaluationResponse[];
  message_history_evaluations: MessageHistoryEvaluationResponse[];
  instruction_evaluations: InstructionEvaluationResponse[];
  full_doc_context_evaluation: FullDocContextEvaluationResponse;
}

export interface LogDetailResponse {
  id: string;
  created_at: string;
  app_name: string;
  environment: string;
  tags?: Record<string, any>;
  inconsistency_detection: boolean;
  hallucination_detection: boolean;
  user_query: string;
  model_output: string;
  hallucination_detection_sample_rate: number;
  updated_at: string;
  status: string;
  has_hallucination: boolean | null;
  has_inconsistency: boolean | null;
  documents: any[] | null;
  message_history: any[] | null;
  instructions: any[] | null;
}

export interface DocumentLogResponse {
  id: string;
  content: string;
  metadata: Record<string, any> | null;
  log_id: string;
  created_at: string;
  updated_at: string;
  index: number;
}

export interface LogMessageHistoryResponse {
  id: string;
  content: Record<string, any>;
  log_id: string;
  created_at: string;
  updated_at: string;
  index: number;
}

export interface LogInstructionResponse {
  id: string;
  content: string;
  log_id: string;
  created_at: string;
  updated_at: string;
  index: number;
}

export interface DetectionResultsResponse {
  log: LogDetailResponse;
  log_documents: DocumentLogResponse[] | null;
  log_message_history: LogMessageHistoryResponse[] | null;
  log_instructions: LogInstructionResponse[] | null;
  evaluations: EvaluationResponse[];
}

// Common evaluation properties - Client side format (camelCase)
export interface BaseEvaluation {
  id: string;
  evaluationId: string;
  reasoning: string;
  score: EVALUATION_SCORE;
  index: number;
  createdAt: string;
  updatedAt: string;
}

// CamelCase interfaces - Client side format
export interface DocumentEvaluation extends BaseEvaluation {
  logDocumentId: string;
}

export interface MessageHistoryEvaluation extends BaseEvaluation {
  logMessageHistoryId: string;
}

export interface InstructionEvaluation extends BaseEvaluation {
  logInstructionId: string;
}

export interface FullDocContextEvaluation extends BaseEvaluation {
  logDocumentIds: string[];
}

export interface Evaluation {
  id: string;
  sentence: string;
  supportingDocumentIds: string[];
  supportingMessageHistoryIds: string[];
  supportingInstructionIds: string[];
  isHallucinated: boolean;
  fullDocContextHasHallucination: boolean;
  index: number;
  documentEvaluations: DocumentEvaluation[];
  messageHistoryEvaluations: MessageHistoryEvaluation[];
  instructionEvaluations: InstructionEvaluation[];
  fullDocContextEvaluation: FullDocContextEvaluation;
}

export interface LogDetail {
  id: string;
  createdAt: string;
  appName: string;
  environment: string;
  tags?: Record<string, any>;
  // New detection parameters (recommended)
  detections?: string[];
  detectionSampleRate?: number;
  // Deprecated detection parameters
  inconsistencyDetection: boolean;
  hallucinationDetection: boolean;
  hallucinationDetectionSampleRate: number;
  userQuery: string;
  modelOutput: string;
  updatedAt: string;
  status: string;
  hasHallucination: boolean | null;
  hasInconsistency: boolean | null;
  documents: any[] | null;
  messageHistory: any[] | null;
  instructions: any[] | null;
}

export interface DocumentLog {
  id: string;
  content: string;
  metadata: Record<string, any> | null;
  logId: string;
  createdAt: string;
  updatedAt: string;
  index: number;
}

export interface LogMessageHistory {
  id: string;
  content: Record<string, any>;
  logId: string;
  createdAt: string;
  updatedAt: string;
  index: number;
}

export interface LogInstruction {
  id: string;
  content: string;
  logId: string;
  createdAt: string;
  updatedAt: string;
  index: number;
}

export interface DetectionResults {
  log: LogDetail;
  logDocuments: DocumentLog[] | null;
  logMessageHistory: LogMessageHistory[] | null;
  logInstructions: LogInstruction[] | null;
  evaluations: Evaluation[];
}
