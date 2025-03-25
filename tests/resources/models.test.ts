import { vi, describe, it, expect } from 'vitest';
import { BaseQuotientClient } from '../../quotientai/client';
import { ModelsResource } from '../../quotientai/resources/models';

const SAMPLE_MODELS = [
    {
        "id": "model-123",
        "name": "gpt-4",
        "provider": {
            "id": "provider-123",
            "name": "OpenAI"
        },
        "created_at": "2024-01-01T00:00:00"
    },
    {
        "id": "model-456",
        "name": "claude-3",
        "provider": {
            "id": "provider-456",
            "name": "Anthropic"
        },
        "created_at": "2024-01-02T00:00:00"
    }
]

describe('ModelsResource', () => {
  it('should list models', async () => {
    const client = new BaseQuotientClient('test');
    const modelsResource = new ModelsResource(client);
    const getMock = vi.spyOn(client, 'get');
    getMock.mockResolvedValue(SAMPLE_MODELS);
    const models = await modelsResource.list(); 
    expect(models).toEqual(SAMPLE_MODELS.map(model => ({
      ...model,
      created_at: new Date(model.created_at)
    })));
    expect(getMock).toHaveBeenCalledWith('/models');
  });

  it('should get a model', async () => {
    const client = new BaseQuotientClient('test');
    const modelsResource = new ModelsResource(client);
    const getMock = vi.spyOn(client, 'get');
    getMock.mockResolvedValue(SAMPLE_MODELS[0]);
    const model = await modelsResource.getModel('gpt-4');
    expect(model).toEqual({
      ...SAMPLE_MODELS[0],
      created_at: new Date(SAMPLE_MODELS[0].created_at)
    });
    expect(getMock).toHaveBeenCalledWith('/models/gpt-4');
  });
  
});
