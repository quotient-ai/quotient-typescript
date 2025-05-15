# quotientai
[![npm version](https://img.shields.io/npm/v/quotientai)](https://www.npmjs.com/package/quotientai)

## Overview

`quotientai` is an SDK built to manage logs and detect hallucinations and inconsistencies in AI responses with [Quotient](https://quotientai.co).

## Installation

```bash
npm install quotientai
```

## Usage

Create an API key on Quotient and set it as an environment variable called `QUOTIENT_API_KEY`. Then check out the examples in the `examples/` directory or see our [docs](https://docs.quotientai.co) for a more comprehensive walkthrough.

The examples directory contains:
- `example_logs.ts` - Logging with hallucination and inconsistency detection

### QuotientAI

The main client class that provides access to all QuotientAI resources.

#### Constructor

```typescript
new QuotientAI(apiKey?: string)
```

- `apiKey`: Optional API key. If not provided, will attempt to read from `QUOTIENT_API_KEY` environment variable.

### QuotientLogger

A logger interface for tracking model interactions and detecting hallucinations.

#### Methods

##### init

```typescript
init(config: {
  appName: string;
  environment: string;
  tags?: Record<string, any>;
  sampleRate?: number;
  hallucinationDetection?: boolean;
  inconsistencyDetection?: boolean;
  hallucinationDetectionSampleRate?: number;
}): QuotientLogger
```

Configures the logger with the provided parameters.

##### log

```typescript
log(params: {
  userQuery: string;
  modelOutput: string;
  documents?: (string | LogDocument)[];
  messageHistory?: Array<Record<string, any>>;
  instructions?: string[];
  tags?: Record<string, any>;
  hallucinationDetection?: boolean;
  inconsistencyDetection?: boolean;
}): Promise<void>
```

Logs a model interaction.

##### pollForDetections

```typescript
pollForDetections(logId: string): Promise<DetectionResults | null>
```

Retrieves the detection results for a specific log entry, including hallucination and inconsistency evaluations. This method polls the API until results are available or a timeout is reached.

## Detection Results

The SDK provides strongly-typed interfaces for working with detection results:

```typescript
interface DetectionResults {
  log: LogDetail;                           // Main log information
  logDocuments: DocumentLog[] | null;       // Reference documents
  logMessageHistory: LogMessageHistory[] | null; // Conversation history
  logInstructions: LogInstruction[] | null; // System instructions
  evaluations: Evaluation[];                // Hallucination evaluations
}
```

Each evaluation includes detailed information about whether content is hallucinated:

```typescript
interface Evaluation {
  id: string;
  sentence: string;
  isHallucinated: boolean;
  // ... additional evaluation details
  documentEvaluations: DocumentEvaluation[];
  messageHistoryEvaluations: MessageHistoryEvaluation[];
  instructionEvaluations: InstructionEvaluation[];
  fullDocContextEvaluation: FullDocContextEvaluation;
}
```

## Error Handling

The client uses a custom `QuotientAIError` class for error handling:

```typescript
try {
  const results = await logger.pollForDetections('log-id');
} catch (error) {
  if (error instanceof QuotientAIError) {
    console.error(`Error ${error.status}: ${error.message}`);
  }
}
```

## License

MIT 