# quotienta
[![npm version](https://img.shields.io/npm/v/quotientai)](https://www.npmjs.com/package/quotientai)

## Overview

`quotientai` is an SDK built to manage artifacts (prompts, datasets), and run evaluations on [Quotient](https://quotientai.co).

## Installation

```bash
npm install quotientai
```

## Usage

Create an API key on Quotient and set it as an environment variable called `QUOTIENT_API_KEY`. Then check out the examples in the `examples/` directory or see our [docs](https://docs.quotientai.co) for a more comprehensive walkthrough.

The examples directory contains:
- `example_evaluate.ts` - Running an evaluation against a dataset
- `example_logs.ts` - Logging with hallucination detection

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