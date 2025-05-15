import { QuotientAI } from 'quotientai';

async function main() {
  const quotient = new QuotientAI();
  console.log('QuotientAI client initialized');

  // configure the logger
  const quotientLogger = quotient.logger.init({
    appName: 'my-app',
    environment: 'dev',
    sampleRate: 1.0,
    tags: { model: 'gpt-4o', feature: 'customer-support' },
    hallucinationDetection: true,
    hallucinationDetectionSampleRate: 1.0,
  });

  console.log('Logger initialized');

  // mock retrieved documents
  const retrievedDocuments = [
    'Sample document 1',
    { pageContent: 'Sample document 2', metadata: { source: 'website.com' } },
    { pageContent: 'Sample document 3' },
  ];

  console.log('Preparing to log with quotient_logger');
  try {
    const logId = await quotientLogger.log({
      userQuery: 'How do I cook a test?',
      modelOutput: 'The capital of France is Paris',
      documents: retrievedDocuments,
      messageHistory: [
        { role: 'system', content: 'You are an expert on geography.' },
        { role: 'user', content: 'What is the capital of France?' },
        { role: 'assistant', content: 'The capital of France is Paris' },
      ],
      instructions: [
        'You are a helpful assistant that answers questions about the world.',
        "Answer the question in a concise manner. If you are not sure, say 'I don't know'.",
      ],
      hallucinationDetection: true,
      inconsistencyDetection: true,
    });
    console.log('pollForDetections with logId: ', logId);

    // poll for the detection results
    const detectionResults = await quotientLogger.pollForDetections(logId);
    console.log('detectionResults', detectionResults);
  } catch (error) {
    console.error(error);
  }
}

main().catch(console.error);
