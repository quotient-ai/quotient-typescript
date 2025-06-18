/*
 * QuotientAI LangChain Example
 *
 * Required installations:
 * npm install quotientai langchain @langchain/core @langchain/openai @arizeai/openinference-instrumentation-langchain
 *
 * This example demonstrates:
 * 1. Manual instrumentation by importing and passing instrumentors
 * 2. Manual span creation using startSpan()
 * 3. Complex multi-step workflows with nested spans
 */

import { QuotientAI } from '../quotientai';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { LangChainInstrumentation } from '@arizeai/openinference-instrumentation-langchain';
import { OpenAIInstrumentation } from '@arizeai/openinference-instrumentation-openai';

// Initialize QuotientAI with the provided API key
const quotient = new QuotientAI(process.env.QUOTIENT_API_KEY);

// Initialize tracing with explicit instrumentors
quotient.tracer.init({
  app_name: 'openinference_test_langchain',
  environment: 'local',
  instruments: [new LangChainInstrumentation(), new OpenAIInstrumentation()],
});

async function testLangChain() {
  try {
    // OpenAIInstrumentation is needed to instrument the OpenAI client
    const chat = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-3.5-turbo',
      temperature: 0.7,
    });

    // Test 1: Simple invoke
    console.log('Test 1: Simple invoke');
    const response1 = await chat.invoke('Write a haiku about artificial intelligence');
    console.log('LangChain response 1:', response1.content);

    // Test 2: Using HumanMessage
    console.log('Test 2: Using HumanMessage');
    const response2 = await chat.invoke([new HumanMessage('Write a short poem about programming')]);
    console.log('LangChain response 2:', response2.content);

    // Test 3: Using ChatPromptTemplate (more complex chain)
    console.log('Test 3: Using ChatPromptTemplate');
    const prompt = ChatPromptTemplate.fromMessages([
      ['human', 'Tell me a {adjective} fact about {topic}'],
    ]);

    const chain = prompt.pipe(chat);
    const response3 = await chain.invoke({
      adjective: 'interesting',
      topic: 'machine learning',
    });
    console.log('LangChain response 3:', response3.content);
  } catch (error) {
    console.error('LangChain call failed:', error.message);
  }
}

// Example of manual span creation with LangChain
async function testLangChainWithManualSpan() {
  const chat = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'gpt-3.5-turbo',
    temperature: 0.9,
  });

  // Create a manual span for a custom conversation workflow
  return await quotient.tracer.startSpan('conversation_workflow', async (span) => {
    try {
      // Add custom attributes to the span
      if (span) {
        span.setAttributes({
          'workflow.type': 'multi_turn_conversation',
          'workflow.steps': 3,
          'model.temperature': 0.9,
          'conversation.topic': 'creative_writing',
        });
      }

      console.log('Starting multi-turn conversation workflow...');

      // Step 1: Initial creative prompt
      await quotient.tracer.startSpan('conversation_step_1', async (step1Span) => {
        if (step1Span) {
          step1Span.setAttributes({
            'step.number': 1,
            'step.type': 'initial_prompt',
            'prompt.category': 'creative',
          });
        }

        console.log('Step 1: Getting initial creative response...');
        const response1 = await chat.invoke('Write a creative opening line for a sci-fi story');
        console.log('Step 1 Response:', response1.content);

        if (step1Span && response1.content) {
          step1Span.setAttributes({
            'response.length': response1.content.length,
            'response.type': 'creative_opening',
          });
        }

        return response1;
      });

      // Step 2: Follow-up with context
      await quotient.tracer.startSpan('conversation_step_2', async (step2Span) => {
        if (step2Span) {
          step2Span.setAttributes({
            'step.number': 2,
            'step.type': 'contextual_followup',
            'prompt.category': 'expansion',
          });
        }

        console.log('Step 2: Expanding the story...');
        const prompt = ChatPromptTemplate.fromMessages([
          ['system', 'You are a creative sci-fi writer. Build upon the previous response.'],
          [
            'human',
            'Now write the next 2-3 sentences that continue this story in an exciting way.',
          ],
        ]);

        const chain = prompt.pipe(chat);
        const response2 = await chain.invoke({});
        console.log('Step 2 Response:', response2.content);

        if (step2Span && response2.content) {
          step2Span.setAttributes({
            'response.length': response2.content.length,
            'chain.components': 'prompt_template + chat_model',
          });
        }

        return response2;
      });

      // Step 3: Final creative conclusion
      await quotient.tracer.startSpan('conversation_step_3', async (step3Span) => {
        if (step3Span) {
          step3Span.setAttributes({
            'step.number': 3,
            'step.type': 'conclusion',
            'prompt.category': 'wrap_up',
          });
        }

        console.log('Step 3: Concluding the story segment...');
        const messages = [
          new HumanMessage(
            'Write a dramatic cliffhanger ending for this story segment in 1-2 sentences.'
          ),
        ];

        const response3 = await chat.invoke(messages);
        console.log('Step 3 Response:', response3.content);

        if (step3Span && response3.content) {
          step3Span.setAttributes({
            'response.length': response3.content.length,
            'message.type': 'HumanMessage',
            'ending.type': 'cliffhanger',
          });
        }

        return response3;
      });

      console.log('Multi-turn conversation workflow completed!');

      // Add final workflow statistics
      if (span) {
        span.setAttributes({
          'workflow.status': 'completed',
          'workflow.total_steps': 3,
        });
      }
    } catch (error) {
      console.error('Conversation workflow failed:', error.message);

      // The span will automatically record the exception
      throw error;
    }
  });
}

async function runAllTests() {
  console.log('=== Test 1: Automatic LangChain Instrumentation ===');
  await testLangChain();

  console.log('\n=== Test 2: Manual Span + Automatic LangChain Instrumentation ===');
  try {
    await testLangChainWithManualSpan();
  } catch (error) {
    console.log('Manual span test completed (error expected with fake API key)');
  }
}

// Run all tests to demonstrate both automatic and manual tracing
runAllTests();
