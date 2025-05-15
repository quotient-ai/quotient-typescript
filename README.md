# quotientai

[![npm version](https://img.shields.io/npm/v/quotientai)](https://www.npmjs.com/package/quotientai)

## Overview

`quotientai` is an SDK built to manage logs and detect hallucinations and inconsistencies in AI responses with [Quotient](https://quotientai.co).

## Installation

```bash
npm install quotientai
```

## Usage

Create an API key on [Quotient](https://app.quotientai.co/dashboard) and set it as an environment variable called `QUOTIENT_API_KEY`.

Send your first log and detect hallucinations. Run the code below and see your Logs and Detections on your [Quotient Dashboard](https://app.quotientai.co/dashboard).

```typescript
import { QuotientAI } from 'quotientai';

const quotient = new QuotientAI();

// initialize the logger
const quotientLogger = quotient.logger.init({
  app_name: 'my-app',
  environment: 'dev',
  sample_rate: 1.0,
  hallucination_detection: true,
  hallucination_detection_sample_rate: 1.0,
});

// create a log
const logId = await quotientLogger.log({
  user_query: 'How do I cook a goose?',
  model_output: 'The capital of France is Paris',
  documents: ['Here is an excellent goose recipe...'],
});

// optionally, you can poll for detection results for further actions
const detectionResults = await quotientLogger.pollForDetections(logId);
```

## Docs

For comprehensive documentation, please visit our [docs](https://docs.quotientai.co).
