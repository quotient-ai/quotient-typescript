# QuotientAI TypeScript Client

A TypeScript client for the QuotientAI API.

## Installation

```bash
npm install quotient-typescript
```

## Usage

```typescript
import { QuotientAI } from 'quotient-typescript';

// Initialize the client
const client = new QuotientAI('your-api-key');

// Configure the logger
client.logger.init({
  app_name: 'my-app',
  environment: 'production',
  sample_rate: 0.1,
  hallucination_detection: true
});

// Log an interaction
await client.logger.log({
  user_query: 'What is the capital of France?',
  model_output: 'Paris is the capital of France.',
  documents: ['document1', 'document2'],
  message_history: [
    { role: 'user', content: 'What is the capital of France?' },
    { role: 'assistant', content: 'Paris is the capital of France.' }
  ],
  instructions: ['Be concise', 'Be accurate'],
  tags: { user_id: '123' }
});

// Evaluate a model
const run = await client.evaluate({
  prompt: { id: 'prompt-1', name: 'Capital City', content: 'What is the capital of {country}?' },
  dataset: { id: 'dataset-1', name: 'Countries' },
  model: { id: 'model-1', name: 'GPT-4' },
  parameters: {
    temperature: 0.7,
    max_tokens: 100
  },
  metrics: ['accuracy', 'latency']
});
```

## Features

- Authentication with API key and JWT token management
- Automatic token refresh
- Configurable logging with sampling
- Hallucination and inconsistency detection
- Model evaluation
- Type safety with TypeScript

## API Reference

### QuotientAI

The main client class that provides access to all QuotientAI resources.

#### Constructor

```typescript
new QuotientAI(apiKey?: string)
```

- `apiKey`: Optional API key. If not provided, will attempt to read from `QUOTIENT_API_KEY` environment variable.

#### Methods

##### evaluate

```typescript
evaluate(params: {
  prompt: Prompt;
  dataset: Dataset;
  model: Model;
  parameters: Record<string, any>;
  metrics: string[];
}): Promise<Run>
```

Evaluates a model on a dataset using a prompt.

### QuotientLogger

A logger interface for tracking model interactions.

#### Methods

##### init

```typescript
init(config: {
  app_name: string;
  environment: string;
  tags?: Record<string, any>;
  sample_rate?: number;
  hallucination_detection?: boolean;
  inconsistency_detection?: boolean;
  hallucination_detection_sample_rate?: number;
}): QuotientLogger
```

Configures the logger with the provided parameters.

##### log

```typescript
log(params: {
  user_query: string;
  model_output: string;
  documents?: string[];
  message_history?: Array<Record<string, any>>;
  instructions?: string[];
  tags?: Record<string, any>;
  hallucination_detection?: boolean;
  inconsistency_detection?: boolean;
}): Promise<void>
```

Logs a model interaction.

## Error Handling

The client uses a custom `QuotientAIError` class for error handling:

```typescript
try {
  await client.evaluate({ ... });
} catch (error) {
  if (error instanceof QuotientAIError) {
    console.error(`Error ${error.status}: ${error.message}`);
  }
}
```

## License

MIT 