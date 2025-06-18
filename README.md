# quotientai

[![npm version](https://img.shields.io/npm/v/quotientai)](https://www.npmjs.com/package/quotientai)

## Overview

`quotientai` is an SDK and CLI for logging data to [Quotient](https://quotientai.co), running hallucination and document attribution detections for retrieval and search-augmented AI systems, and **automatically tracing AI/ML applications**.

## Installation

```bash
npm install quotientai
```

## Usage

### Logging and Hallucination Detection

Create an API key on [Quotient](https://app.quotientai.co) and set it as an environment variable called `QUOTIENT_API_KEY`. Then follow the examples below or see our [docs](https://docs.quotientai.co) for a more comprehensive walkthrough.

Send your first log and detect hallucinations. Run the code below and see your Logs and Detections on your [Quotient Dashboard](https://app.quotientai.co/dashboard).

```typescript
import { QuotientAI } from 'quotientai';

const quotient = new QuotientAI(apiKey?: string);

// initialize the logger
const quotientLogger = quotient.logger.init({
  appName: 'my-app',
  environment: 'dev',
  sampleRate: 1.0,
  hallucinationDetection: true,
  hallucinationDetectionSampleRate: 1.0,
});

// create a log
const logId = await quotientLogger.log({
  userQuery: 'How do I cook a goose?',
  modelOutput: 'The capital of France is Paris',
  documents: ['Here is an excellent goose recipe...'],
});

// optionally, you can poll for detection results for further actions
const detectionResults = await quotientLogger.pollForDetections(logId);
```

### Instrumentation for AI/ML Libraries with OpenInference

QuotientAI detects and instruments supported AI/ML libraries:

```typescript
import { QuotientAI } from 'quotientai';
import { LangChainInstrumentation } from '@arizeai/openinference-instrumentation-langchain';
import { OpenAIInstrumentation } from '@arizeai/openinference-instrumentation-openai';

const quotient = new QuotientAI('your-api-key');

// Initialize tracing for all supported libraries
quotient.tracer.init({
  app_name: 'my-ai-app',
  environment: 'production',
  instruments: [new LangChainInstrumentation(), new OpenAIInstrumentation()],
});

// Your AI library calls are now traced
```

#### Supported Libraries

| Library        | Package                        | Supported Instrumentation Package                  |
| -------------- | ------------------------------ | -------------------------------------------------- |
| **OpenAI SDK** | `openai`                       | `@arizeai/openinference-instrumentation-langchain` |
| **LangChain**  | `langchain`, `@langchain/core` | `@arizeai/openinference-instrumentation-langchain` |

````

### QuotientAI Client

The main client class that provides access to all QuotientAI resources.

#### Constructor

```typescript
new QuotientAI(apiKey?: string)
````

- `apiKey`: Optional API key. If not provided, will attempt to read from `QUOTIENT_API_KEY` environment variable.

## Examples

Check out the `examples/` directory for complete examples of:

- OpenAI SDK tracing
- LangChain tracing

## Docs

For comprehensive documentation, please visit our [docs](https://docs.quotientai.co).
