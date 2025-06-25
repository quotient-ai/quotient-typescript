import { QuotientAI, DetectionType } from 'quotientai';

async function main() {
  const quotient = new QuotientAI();
  console.log('QuotientAI client initialized');

  // Example 1: Using new detection parameters (recommended)
  console.log('=== Example 1: New Detection Parameters (Recommended) ===');

  const quotientLogger = quotient.logger.init({
    appName: 'my-app',
    environment: 'dev',
    sampleRate: 1.0,
    tags: { model: 'gpt-4o', feature: 'customer-support' },
    // New detection parameters (recommended)
    detections: [DetectionType.HALLUCINATION, DetectionType.DOCUMENT_RELEVANCY],
    detectionSampleRate: 1.0,
  });

  console.log('Logger initialized with new detection parameters');

  // mock retrieved documents
  const retrievedDocuments = [
    'Sample document 1: France is a country in Europe.',
    {
      pageContent: 'Sample document 2: Paris is the capital city of France.',
      metadata: { source: 'website.com' },
    },
    { pageContent: 'Sample document 3: France has a population of about 67 million people.' },
  ];

  try {
    const logId = await quotientLogger.log({
      userQuery: 'What is the capital of France?',
      modelOutput: 'The capital of France is Paris, which is also the largest city in the country.',
      documents: retrievedDocuments,
      messageHistory: [
        { role: 'system', content: 'You are an expert on geography.' },
        { role: 'user', content: 'What is the capital of France?' },
        {
          role: 'assistant',
          content: 'The capital of France is Paris, which is also the largest city in the country.',
        },
      ],
      instructions: [
        'You are a helpful assistant that answers questions about geography.',
        'Answer the question accurately based on the provided documents.',
      ],
      // Can also override detection parameters per log
      detections: [DetectionType.HALLUCINATION],
      detectionSampleRate: 1.0,
    });

    console.log('Log created with ID:', logId);

    // poll for the detection results
    const detectionResults = await quotientLogger.pollForDetections(logId);
    console.log('Detection results:', detectionResults ? 'available' : 'not available');
  } catch (error) {
    console.error('Error with new detection parameters:', error);
  }

  // Example 2: Document relevancy only (shows optional field validation)
  console.log('\n=== Example 2: Document Relevancy Only (Flexible Validation) ===');

  try {
    const relevancyLogger = quotient.logger.init({
      appName: 'my-app-relevancy',
      environment: 'dev',
      sampleRate: 1.0,
      detections: [DetectionType.DOCUMENT_RELEVANCY],
      detectionSampleRate: 1.0,
    });

    const relevancyLogId = await relevancyLogger.log({
      userQuery: 'What is the capital of France?',
      documents: retrievedDocuments,
      // Note: modelOutput is optional for document relevancy detection
    });

    console.log('Document relevancy log created with ID:', relevancyLogId);
  } catch (error) {
    console.error('Error with document relevancy:', error);
  }
}

main().catch(console.error);
