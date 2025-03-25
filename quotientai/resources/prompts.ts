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
        id: prompt.id,
        name: prompt.name,
        content: prompt.content,
        version: prompt.version,
        system_prompt: prompt.system_prompt,
        user_prompt: prompt.user_prompt,
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
      id: response.id,
      name: response.name,
      content: response.content,
      version: response.version,
      system_prompt: response.system_prompt,
      user_prompt: response.user_prompt,
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
      id: response.id,
      name: response.name,
      content: response.content,
      version: response.version,
      system_prompt: response.system_prompt,
      user_prompt: response.user_prompt,
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
      id: response.id,
      name: response.name,
      content: response.content,
      version: response.version,
      system_prompt: response.system_prompt,
      user_prompt: response.user_prompt,
      created_at: new Date(response.created_at),
      updated_at: new Date(response.updated_at)
    };
  }

  async deletePrompt(prompt: Prompt): Promise<void> {
    await this.client.patch(`/prompts/${prompt.id}`, {
      id: prompt.id,
      name: prompt.name,
      system_prompt: prompt.system_prompt,
      user_prompt: prompt.user_prompt,
      is_deleted: true
    });
  }
}
