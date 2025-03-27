import { describe, it, expect, vi } from 'vitest';
import { BaseQuotientClient } from '../../quotientai/client';
import { PromptsResource } from '../../quotientai/resources/prompts';

const SAMPLE_PROMPTS = [
    {
        id: 'test',
        name: 'test',
        content: 'test',
        version: 1,
        user_prompt: 'test',
        system_prompt: 'test',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
    },
    {
        id: 'test2',
        name: 'test2',
        content: 'test2',
        version: 2,
        user_prompt: 'test2',
        system_prompt: 'test2',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
    }   
]   
describe('PromptsResource', () => {
    it('should list prompts', async () => {
        const client = new BaseQuotientClient('test');
        const promptsResource = new PromptsResource(client);
        const getMock = vi.spyOn(client, 'get');
        getMock.mockResolvedValue(SAMPLE_PROMPTS);
        const prompts = await promptsResource.list();
        expect(prompts).toEqual(SAMPLE_PROMPTS.map(prompt => ({
            ...prompt,
            created_at: new Date(prompt.created_at),
            updated_at: new Date(prompt.updated_at)
        })));   
        expect(getMock).toHaveBeenCalledWith('/prompts');
    });

    it('should get a prompt', async () => {
        const client = new BaseQuotientClient('test');
        const promptsResource = new PromptsResource(client);
        const getMock = vi.spyOn(client, 'get');
        getMock.mockResolvedValue(SAMPLE_PROMPTS[0]);
        const prompt = await promptsResource.getPrompt({ id: 'test' });
        expect(prompt).toEqual({
            ...SAMPLE_PROMPTS[0],
            created_at: new Date(SAMPLE_PROMPTS[0].created_at),
            updated_at: new Date(SAMPLE_PROMPTS[0].updated_at)
        });
        expect(getMock).toHaveBeenCalledWith('/prompts/test');
    });

    it('should get a prompt by version', async () => {
        const client = new BaseQuotientClient('test');
        const promptsResource = new PromptsResource(client);
        const getMock = vi.spyOn(client, 'get');
        getMock.mockResolvedValue(SAMPLE_PROMPTS[0]);
        const prompt = await promptsResource.getPrompt({ id: 'test', version: '1' });
        expect(prompt).toEqual({
            ...SAMPLE_PROMPTS[0],
            created_at: new Date(SAMPLE_PROMPTS[0].created_at),
            updated_at: new Date(SAMPLE_PROMPTS[0].updated_at)
        });
        expect(getMock).toHaveBeenCalledWith('/prompts/test/versions/1');
    });

    it('should create a prompt', async () => {
        const client = new BaseQuotientClient('test');
        const promptsResource = new PromptsResource(client);
        const postMock = vi.spyOn(client, 'post');
        postMock.mockResolvedValue(SAMPLE_PROMPTS[0]);
        const prompt = await promptsResource.create({
            name: 'test',
            system_prompt: 'test',
            user_prompt: 'test'
        });
        expect(prompt).toEqual({
            ...SAMPLE_PROMPTS[0],
            created_at: new Date(SAMPLE_PROMPTS[0].created_at),
            updated_at: new Date(SAMPLE_PROMPTS[0].updated_at)
        });
        expect(postMock).toHaveBeenCalledWith('/prompts', { name: 'test', system_prompt: 'test', user_prompt: 'test' });
    });

    it('should update a prompt', async () => {
        const client = new BaseQuotientClient('test');
        const promptsResource = new PromptsResource(client);
        const patchMock = vi.spyOn(client, 'patch');
        patchMock.mockResolvedValue(SAMPLE_PROMPTS[0]);
        const prompt = await promptsResource.update({
            prompt: {
                ...SAMPLE_PROMPTS[0],
                created_at: new Date(SAMPLE_PROMPTS[0].created_at),
                updated_at: new Date(SAMPLE_PROMPTS[0].updated_at)
            }
        });
        expect(prompt).toEqual({
            ...SAMPLE_PROMPTS[0],
            created_at: new Date(SAMPLE_PROMPTS[0].created_at),
            updated_at: new Date(SAMPLE_PROMPTS[0].updated_at)
        });
    });
    it('should delete a prompt', async () => {
        const client = new BaseQuotientClient('test');
        const promptsResource = new PromptsResource(client);
        const patchMock = vi.spyOn(client, 'patch');
        patchMock.mockResolvedValue(SAMPLE_PROMPTS[0]);
        await promptsResource.deletePrompt({
            prompt: {
                ...SAMPLE_PROMPTS[0],
                created_at: new Date(SAMPLE_PROMPTS[0].created_at),
                updated_at: new Date(SAMPLE_PROMPTS[0].updated_at)
            }
        });
        expect(patchMock).toHaveBeenCalledWith('/prompts/test', { id: 'test', name: 'test', system_prompt: 'test', user_prompt: 'test', is_deleted: true });
    });
});
