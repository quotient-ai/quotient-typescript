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

    console.log("Preparing to log with quotient_logger")
    try {
        await quotient.logger.log({
            user_query: "How do I cook a goose?",
            model_output: "The capital of France is Paris",
            documents: ["Here is an excellent goose recipe..."],
            hallucination_detection: true,
            inconsistency_detection: false
        });
    } catch (error) {
        console.error(error)
    }

    console.log("Logged with quotient_logger")
}

main().catch(console.error);
