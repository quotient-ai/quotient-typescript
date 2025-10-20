import { QuotientAI, DetectionType } from 'quotientai';

async function main() {
  const quotient = new QuotientAI();
  console.log('QuotientAI client initialized');

  // configure the logger
  quotient.logger.init({
    appName: 'my-app',
    environment: 'dev',
    sampleRate: 1.0,
    tags: { model: 'gpt-4o', feature: 'customer-support' },
    detections: [DetectionType.HALLUCINATION, DetectionType.DOCUMENT_RELEVANCY],
    detectionSampleRate: 1.0,
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
    const logId = await quotient.log({
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
    });
    console.log('logged with logId: ', logId);
  } catch (error) {
    console.error(error);
  }
}

main().catch(console.error);
