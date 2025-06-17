import { QuotientAI } from '../quotientai';
import OpenAI from 'openai';

const quotient = new QuotientAI(process.env.QUOTIENT_API_KEY);

// Initialize tracing - automatically detects and instruments all supported libraries!
quotient.tracer.init({
  app_name: 'openinference_test_openai',
  environment: 'local',
});

async function testOpenAI() {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: 'Write a haiku about programming',
        },
      ],
      max_tokens: 50,
    });

    console.log('OpenAI Response:', response.choices[0]?.message?.content);
    return response;
  } catch (error) {
    console.log('OpenAI call failed (expected with fake key):', error.message);
    return null;
  }
}

// Example of manual span creation using startSpan
async function testOpenAIWithManualSpan() {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Create a manual span for custom business logic
  return await quotient.tracer.startSpan('custom_openai_workflow', async (span) => {
    try {
      // Add custom attributes to the span
      if (span) {
        span.setAttributes({
          'workflow.type': 'creative_writing',
          'workflow.step': 'haiku_generation',
          'model.name': 'gpt-3.5-turbo',
        });
      }

      console.log('Running custom OpenAI workflow...');

      // This OpenAI call will still be automatically instrumented
      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a creative writing assistant specializing in poetry.',
          },
          {
            role: 'user',
            content: 'Write a beautiful haiku about the art of programming',
          },
        ],
        max_tokens: 100,
        temperature: 0.8,
      });

      const content = response.choices[0]?.message?.content;
      console.log('Custom Workflow OpenAI Response:', content);

      // Add result metadata to the span
      if (span && content) {
        span.setAttributes({
          'response.length': content.length,
          'response.preview': content.substring(0, 50) + '...',
        });
      }

      return response;
    } catch (error) {
      console.log('Custom workflow failed (expected with fake key):', error.message);

      // The span will automatically record the exception
      throw error;
    }
  });
}

async function runAllTests() {
  console.log('=== Test 1: Automatic OpenAI Instrumentation ===');
  await testOpenAI();

  console.log('\n=== Test 2: Manual Span + Automatic OpenAI Instrumentation ===');
  try {
    await testOpenAIWithManualSpan();
  } catch (error) {
    console.log('Manual span test completed (error expected with fake API key)');
  }
}

// Run all tests to demonstrate both automatic and manual tracing
runAllTests();
