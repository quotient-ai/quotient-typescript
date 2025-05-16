# quotientai

[![npm version](https://img.shields.io/npm/v/quotientai)](https://www.npmjs.com/package/quotientai)

## Overview

`quotientai` is an SDK and CLI for logging data to [Quotient](https://quotientai.co), and running hallucination and document attribution detections for retrieval and search-augmented AI systems.

## Installation

```bash
npm install quotientai
```

## Usage

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

### QuotientAI Client

The main client class that provides access to all QuotientAI resources.

#### Constructor

```typescript
new QuotientAI(apiKey?: string)
```

- `apiKey`: Optional API key. If not provided, will attempt to read from `QUOTIENT_API_KEY` environment variable.

## Docs

For comprehensive documentation, please visit our [docs](https://docs.quotientai.co).
