import { QuotientAI } from '../quotientai';

// Helper function to generate random text
function generateRandomText(length: number = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

async function main() {
  // Initialize the client
  const quotient = new QuotientAI();

  // Create a new prompt
  const newPrompt = await quotient.prompts.create(
    generateRandomText(10),  // name
    generateRandomText(100), // system_prompt
    generateRandomText(100)  // user_prompt
  );

  console.log(newPrompt);
}

// Run the example
main().catch(console.error); 