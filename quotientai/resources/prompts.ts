import { logError } from '../exceptions';
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

interface GetPromptParams {
  id: string;
  version?: string;
}

interface CreatePromptParams {
  name: string;
  system_prompt?: string;
  user_prompt?: string;
}

interface UpdatePromptParams {
  prompt: Prompt;
}


export class PromptsResource {
  protected client: BaseQuotientClient;

  constructor(client: BaseQuotientClient) {
    this.client = client;
  }

  // list all prompts
  // no params
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

  // get a prompt
  // options: GetPromptParams
  async getPrompt(options: GetPromptParams): Promise<Prompt | null> {
    let path = `/prompts/${options.id}`;
    if (options.version) {
      path += `/versions/${options.version}`;
    }
    const response = await this.client.get(path) as PromptResponse;
    if (!response) {
      logError(new Error('Prompt not found'));
      return null;
    }
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

  // create a prompt
  // options: CreatePromptParams
  async create(params: CreatePromptParams): Promise<Prompt> {
    const response = await this.client.post('/prompts', {
      name: params.name,
      system_prompt: params.system_prompt,
      user_prompt: params.user_prompt
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

  // update a prompt
  // options: UpdatePromptParams
  async update(options: UpdatePromptParams): Promise<Prompt> {
    const response = await this.client.patch(`/prompts/${options.prompt.id}`, {
      name: options.prompt.name,
      system_prompt: options.prompt.system_prompt,
      user_prompt: options.prompt.user_prompt
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

  // delete a prompt
  // options: UpdatePromptParams
  async deletePrompt(options: UpdatePromptParams): Promise<void> {
    await this.client.patch(`/prompts/${options.prompt.id}`, {
      id: options.prompt.id,
      name: options.prompt.name,
      system_prompt: options.prompt.system_prompt,
      user_prompt: options.prompt.user_prompt,
      is_deleted: true
    });
  }
}
