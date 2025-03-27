import { QuotientAI } from '../quotientai';

async function main() {
    const quotient = new QuotientAI();
    console.log("QuotientAI client initialized")

    // configure the logger
    quotient.logger.init({
        app_name: "my-app",
        environment: "dev",
        sample_rate: 1.0,
        tags: { model: "gpt-4o", feature: "customer-support" },
        hallucination_detection: true,
    })

    console.log("Logger initialized")

    // mock retrieved documents
    const retrieved_documents = [{"page_content": "Sample document"}]
    const documents = retrieved_documents.map(doc => doc["page_content"])

    console.log("Preparing to log with quotient_logger")
    try {
        await quotient.logger.log({
            user_query: "How do I cook a goose?",
            model_output: "The capital of France is Paris",
            documents: documents,
            message_history: [
                {"role": "system", "content": "You are an expert on geography."},
                {"role": "user", "content": "What is the capital of France?"},
                {"role": "assistant", "content": "The capital of France is Paris"},
            ],
            instructions: [
                "You are a helpful assistant that answers questions about the world.",
                "Answer the question in a concise manner. If you are not sure, say 'I don't know'.",
            ],
            hallucination_detection: true,
            inconsistency_detection: true,
        });
    } catch (error) {
        console.error(error)
    }

    console.log("Logged with quotient_logger")
}

main().catch(console.error);
