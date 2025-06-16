import { QuotientAI } from '../quotientai';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';

// Initialize QuotientAI with the provided API key
const quotient = new QuotientAI(process.env.QUOTIENT_API_KEY);

// Initialize tracing - automatically detects and instruments all supported libraries!
quotient.tracer.init({
  app_name: 'openinference_test_langchain',
  environment: 'local',
});

async function testLangChain() {
  try {
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

// Run the test
testLangChain();
