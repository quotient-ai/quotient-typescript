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

// Automatically traced
testOpenAI();
