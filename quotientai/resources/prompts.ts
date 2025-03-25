import { BaseQuotientClient } from '../client';
import { Prompt } from '../types';

interface PromptResponse {
  id: string;
  name: string;
  content: string;
  version: number;
  system_prompt?: string;
  user_prompt: string;
  created_at: string;
  updated_at: string;
}

export class PromptsResource {
  protected client: BaseQuotientClient;

  constructor(client: BaseQuotientClient) {
    this.client = client;
  }

  async list(): Promise<Prompt[]> {
    const response = await this.client.get('/prompts') as PromptResponse[];
    const prompts: Prompt[] = [];

    for (const prompt of response) {
      prompts.push({
        ...prompt,
        created_at: new Date(prompt.created_at),
        updated_at: new Date(prompt.updated_at)
      });
    }
    return prompts;
  }

  async getPrompt(id: string, version?: string): Promise<Prompt> {
    let path = `/prompts/${id}`;
    if (version) {
      path += `/versions/${version}`;
    }
    const response = await this.client.get(path) as PromptResponse;
    return {
      ...response,
      created_at: new Date(response.created_at),
      updated_at: new Date(response.updated_at)
    };
  } 

  async create(name: string, system_prompt?: string, user_prompt?: string): Promise<Prompt> {
    const response = await this.client.post('/prompts', {
      name,
      system_prompt,
      user_prompt
    }) as PromptResponse;
    return {
      ...response,
      created_at: new Date(response.created_at),
      updated_at: new Date(response.updated_at)
    };
  }

  async update(prompt: Prompt): Promise<Prompt> {
    const response = await this.client.patch(`/prompts/${prompt.id}`, {
      name: prompt.name,
      system_prompt: prompt.system_prompt,
      user_prompt: prompt.user_prompt
    }) as PromptResponse;
    return {
      ...response,
      created_at: new Date(response.created_at),
      updated_at: new Date(response.updated_at)
    };
  }

  async deletePrompt(prompt: Prompt): Promise<void> {
    await this.client.delete(`/prompts/${prompt.id}`);
  }
}
