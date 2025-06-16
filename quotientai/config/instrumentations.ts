export interface InstrumentationConfig {
  name: string;
  moduleName: string[];
  packageName: string;
  className: string;
}

/**
 * Configuration for all supported instrumentations
 * Add new instrumentations here following the same pattern
 */
export const INSTRUMENTATION_CONFIGS: InstrumentationConfig[] = [
  {
    name: 'OpenAIInstrumentation',
    moduleName: ['openai'],
    packageName: '@arizeai/openinference-instrumentation-openai',
    className: 'OpenAIInstrumentation',
  },
  {
    name: 'LangChainInstrumentation',
    moduleName: ['langchain', '@langchain/core', '@langchain/openai'],
    packageName: '@arizeai/openinference-instrumentation-langchain',
    className: 'LangChainInstrumentation',
  },
];
