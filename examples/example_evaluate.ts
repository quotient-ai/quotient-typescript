import { QuotientAI } from '../quotientai';

async function main() {
    const quotient = new QuotientAI();

    // create a prompt
    const prompt = await quotient.prompts.create({
        name: "quotient-demo-prompt",
        system_prompt: "I have a problem",
        user_prompt: "Here is a user's inquiry {{input}}, and the context {{context}}",
    });

    console.log(`Prompt ID: ${prompt?.id}`);

    // create a dataset
    const dataset = await quotient.datasets.create({
        name: "quotient-demo-dataset",
        rows: [
            {
                input: "I have a problem",
                context: "here is a support ticket",
                expected: "I'm sorry to hear that. What's the problem?",
            },
            {
                input: "I need help",
                context: "here is a support ticket",
                expected: "I'm sorry to hear that. What's the problem?",
            },
            {
                input: "I want to cancel my subscription",
                expected: "I'm sorry to hear that. I can help you with that. Please provide me with your account information.",
            },
        ],
    });

    console.log(`Dataset ID: ${dataset?.id}`);

    // list out the models
    const models = await quotient.models.list();

    // get gpt4o-mini model
    const model = models.find(model => model.name === "gpt-4o-mini-2024-07-18");

    if (!model) {
        throw new Error("Model not found");
    }

    console.log(`Model ID: ${model.id}`);

    // create a run
    const run = await quotient.runs.create({
        prompt: prompt,
        dataset: dataset,
        model: model,
        parameters: {
            temperature: 0.7,
            top_k: 50,
            top_p: 0.9,
            max_tokens: 100,
        },
        metrics: ["exactmatch", "rouge", "bleu"],
    });

    console.log(`Run ID: ${run?.id}`);    
}

main();
