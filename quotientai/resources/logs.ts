import { logError } from '../exceptions';
import { BaseQuotientClient } from '../client';
import {
  LogDocument,
  DetectionResultsResponse,
  DetectionResults,
  Evaluation,
  LogDetail,
  DocumentLog,
  LogMessageHistory,
  LogInstruction,
  DocumentEvaluation,
  MessageHistoryEvaluation,
  InstructionEvaluation,
  FullDocContextEvaluation,
  DocumentEvaluationResponse,
  MessageHistoryEvaluationResponse,
  InstructionEvaluationResponse,
} from '../types';

// Snake case interface for API responses
interface LogResponse {
  id: string;
  app_name: string;
  environment: string;
  hallucination_detection: boolean;
  inconsistency_detection: boolean;
  user_query: string;
  model_output: string;
  documents: (string | { page_content: string; metadata?: Record<string, any> })[];
  message_history: any[] | null;
  instructions: string[] | null;
  tags: Record<string, any>;
  created_at: string;
}

interface LogsResponse {
  logs: LogResponse[];
}

// CamelCase interface for client-side params, will be converted to snake_case for API
interface CreateLogParams {
  id?: string;
  createdAt?: string;
  appName: string;
  environment: string;
  // Common input parameters (optional, validated based on detection types)
  userQuery?: string;
  modelOutput?: string;
  documents?: (string | LogDocument)[];
  messageHistory?: any[] | null;
  instructions?: string[] | null;
  tags?: Record<string, any>;
  // Only new detection parameters (deprecated params converted before reaching here)
  detections?: string[];
  detectionSampleRate?: number;
}

// CamelCase interface for client-side params, will be converted to snake_case for API
interface ListLogsParams {
  appName?: string;
  environment?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class Log {
  id: string;
  appName: string;
  environment: string;
  hallucinationDetection: boolean;
  inconsistencyDetection: boolean;
  userQuery: string;
  modelOutput: string;
  documents: (string | LogDocument)[];
  messageHistory: any[] | null;
  instructions: string[] | null;
  tags: Record<string, any>;
  createdAt: Date;

  constructor(data: LogResponse) {
    this.id = data.id;
    this.appName = data.app_name;
    this.environment = data.environment;
    this.hallucinationDetection = data.hallucination_detection;
    this.inconsistencyDetection = data.inconsistency_detection;
    this.userQuery = data.user_query;
    this.modelOutput = data.model_output;

    // Convert documents with page_content to pageContent format for client-side use
    this.documents = data.documents.map((doc) => {
      if (typeof doc === 'string') {
        return doc;
      } else if (doc && typeof doc === 'object' && 'page_content' in doc) {
        const { page_content, metadata } = doc;
        return {
          pageContent: page_content,
          metadata,
        } as LogDocument;
      }
      return doc;
    });

    this.messageHistory = data.message_history;
    this.instructions = data.instructions;
    this.tags = data.tags;
    this.createdAt = new Date(data.created_at);
  }

  toString(): string {
    return `Log(id="${this.id}", appName="${this.appName}", environment="${this.environment}", createdAt="${this.createdAt.toISOString()}")`;
  }
}

export class LogsResource {
  protected client: BaseQuotientClient;

  constructor(client: BaseQuotientClient) {
    this.client = client;
  }

  // Create a log
  async create(params: CreateLogParams): Promise<any> {
    try {
      // Convert document objects with pageContent to page_content format for API
      const convertedDocuments =
        params.documents?.map((doc) => {
          if (typeof doc === 'string') {
            return doc;
          } else if (doc && typeof doc === 'object' && 'pageContent' in doc) {
            const { pageContent, metadata } = doc;
            return {
              page_content: pageContent,
              metadata,
            };
          }
          return doc;
        }) || [];

      // Convert camelCase params to snake_case for API
      const apiParams = {
        id: params.id,
        created_at: params.createdAt,
        app_name: params.appName,
        environment: params.environment,
        user_query: params.userQuery,
        model_output: params.modelOutput,
        documents: convertedDocuments,
        message_history: params.messageHistory,
        instructions: params.instructions,
        tags: params.tags,
        // Only new detection parameters (deprecated params converted before reaching here)
        detections: params.detections,
        detection_sample_rate: params.detectionSampleRate,
      };

      const response = await this.client.post('/logs', apiParams);
      return response;
    } catch (error) {
      logError(error as Error, 'LogsResource.create');
      return null;
    }
  }

  // List logs
  async list(params: ListLogsParams = {}): Promise<Log[]> {
    // Convert camelCase params to snake_case for API
    const queryParams: Record<string, any> = {};

    if (params.appName) queryParams.app_name = params.appName;
    if (params.environment) queryParams.environment = params.environment;
    if (params.startDate) queryParams.start_date = params.startDate.toISOString();
    if (params.endDate) queryParams.end_date = params.endDate.toISOString();
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.offset !== undefined) queryParams.offset = params.offset;

    try {
      const response = (await this.client.get('/logs', queryParams)) as LogsResponse;

      // Check if response has logs property and it's an array
      if (!response || !response.logs || !Array.isArray(response.logs)) {
        console.warn('No logs found. Please check your query parameters and try again.');
        return [];
      }

      // Map the logs to Log objects
      return response.logs.map((logData) => new Log(logData));
    } catch (error) {
      logError(error as Error, 'LogsResource.list');
      return [];
    }
  }

  /**
   * Get detection results for a log
   * @param logId The ID of the log to get detection results for
   * @returns Promise resolving to the detection results when available
   * @throws Error if the API call fails, to allow for proper retry handling
   */
  async getDetections(logId: string): Promise<DetectionResults | null> {
    try {
      if (!logId) {
        throw new Error('Log ID is required for detection polling');
      }

      // The path should match the Python implementation which uses `/logs/{log_id}/rca`
      const path = `/logs/${logId}/rca`;
      const response = (await this.client.get(path)) as DetectionResultsResponse;

      if (!response) {
        return null;
      }

      // Convert snake_case response to camelCase
      return this.convertToDetectionResults(response);
    } catch (error) {
      return null;
    }
  }

  /**
   * Converts snake_case API response to camelCase DetectionResults
   */
  private convertToDetectionResults(response: DetectionResultsResponse): DetectionResults {
    // Convert LogDetail
    const logDetail: LogDetail = {
      id: response.log.id,
      createdAt: response.log.created_at,
      appName: response.log.app_name,
      environment: response.log.environment,
      tags: response.log.tags,
      inconsistencyDetection: response.log.inconsistency_detection,
      hallucinationDetection: response.log.hallucination_detection,
      userQuery: response.log.user_query,
      modelOutput: response.log.model_output,
      hallucinationDetectionSampleRate: response.log.hallucination_detection_sample_rate,
      updatedAt: response.log.updated_at,
      status: response.log.status,
      hasHallucination: response.log.has_hallucination,
      hasInconsistency: response.log.has_inconsistency,
      docRelevancyAverage: response.log.doc_relevancy_average,
      documents: response.log.documents,
      messageHistory: response.log.message_history,
      instructions: response.log.instructions,
    };

    // Convert LogDocuments
    const logDocuments =
      response.log_documents?.map((doc) => {
        const documentLog: DocumentLog = {
          id: doc.id,
          content: doc.content,
          metadata: doc.metadata,
          logId: doc.log_id,
          createdAt: doc.created_at,
          updatedAt: doc.updated_at,
          index: doc.index,
          isRelevant: doc.is_relevant,
          relevancyReasoning: doc.relevancy_reasoning,
        };
        return documentLog;
      }) || null;

    // Convert LogMessageHistory
    const logMessageHistory =
      response.log_message_history?.map((msg) => {
        const messageHistory: LogMessageHistory = {
          id: msg.id,
          content: msg.content,
          logId: msg.log_id,
          createdAt: msg.created_at,
          updatedAt: msg.updated_at,
          index: msg.index,
        };
        return messageHistory;
      }) || null;

    // Convert LogInstructions
    const logInstructions =
      response.log_instructions?.map((inst) => {
        const instruction: LogInstruction = {
          id: inst.id,
          content: inst.content,
          logId: inst.log_id,
          createdAt: inst.created_at,
          updatedAt: inst.updated_at,
          index: inst.index,
        };
        return instruction;
      }) || null;

    // Convert Evaluations
    const evaluations = response.evaluations.map((evalItem) => {
      // Convert document evaluations
      const documentEvaluations = evalItem.document_evaluations.map(
        (docEval: DocumentEvaluationResponse) => {
          const documentEvaluation: DocumentEvaluation = {
            id: docEval.id,
            evaluationId: docEval.evaluation_id,
            reasoning: docEval.reasoning,
            score: docEval.score,
            index: docEval.index,
            createdAt: docEval.created_at,
            updatedAt: docEval.updated_at,
            logDocumentId: docEval.log_document_id,
          };
          return documentEvaluation;
        }
      );

      // Convert message history evaluations
      const messageHistoryEvaluations = evalItem.message_history_evaluations.map(
        (msgEval: MessageHistoryEvaluationResponse) => {
          const messageHistoryEvaluation: MessageHistoryEvaluation = {
            id: msgEval.id,
            evaluationId: msgEval.evaluation_id,
            reasoning: msgEval.reasoning,
            score: msgEval.score,
            index: msgEval.index,
            createdAt: msgEval.created_at,
            updatedAt: msgEval.updated_at,
            logMessageHistoryId: msgEval.log_message_history_id,
          };
          return messageHistoryEvaluation;
        }
      );

      // Convert instruction evaluations
      const instructionEvaluations = evalItem.instruction_evaluations.map(
        (instEval: InstructionEvaluationResponse) => {
          const instructionEvaluation: InstructionEvaluation = {
            id: instEval.id,
            evaluationId: instEval.evaluation_id,
            reasoning: instEval.reasoning,
            score: instEval.score,
            index: instEval.index,
            createdAt: instEval.created_at,
            updatedAt: instEval.updated_at,
            logInstructionId: instEval.log_instruction_id,
          };
          return instructionEvaluation;
        }
      );

      // Convert full doc context evaluation
      const fullDocEval = evalItem.full_doc_context_evaluation;
      const fullDocContextEvaluation: FullDocContextEvaluation | null = fullDocEval
        ? {
            id: fullDocEval.id,
            evaluationId: fullDocEval.evaluation_id,
            reasoning: fullDocEval.reasoning,
            score: fullDocEval.score,
            index: fullDocEval.index,
            createdAt: fullDocEval.created_at,
            updatedAt: fullDocEval.updated_at,
            logDocumentIds: fullDocEval.log_document_ids,
          }
        : null;

      const evaluation: Evaluation = {
        id: evalItem.id,
        sentence: evalItem.sentence,
        supportingDocumentIds: evalItem.supporting_document_ids,
        supportingMessageHistoryIds: evalItem.supporting_message_history_ids,
        supportingInstructionIds: evalItem.supporting_instruction_ids,
        isHallucinated: evalItem.is_hallucinated,
        fullDocContextHasHallucination: evalItem.full_doc_context_has_hallucination,
        index: evalItem.index,
        documentEvaluations,
        messageHistoryEvaluations,
        instructionEvaluations,
        fullDocContextEvaluation,
      };
      return evaluation;
    });

    // Construct and return the camelCase DetectionResults
    return {
      log: logDetail,
      logDocuments,
      logMessageHistory,
      logInstructions,
      evaluations,
    };
  }
}
