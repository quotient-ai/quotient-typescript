import { vi, describe, it, expect } from 'vitest';
import { BaseQuotientClient } from '../../quotientai/client';
import { MetricsResource } from '../../quotientai/resources/metrics';

const SAMPLE_METRICS = [
    "bertscore",
    "exactmatch",
    "faithfulness_selfcheckgpt",
    "sentence_tranformers_similarity",
    "f1score",
    "jaccard_similarity",
    "knowledge_f1score",
    "meteor",
    "normalized_exactmatch",
    "rouge_for_context",
    "rouge1",
    "rouge2",
    "rougeL",
    "rougeLsum",
    "sacrebleu",
    "verbosity_ratio",
]

describe('MetricsResource', () => {
  it('should list metrics', async () => {
    const client = new BaseQuotientClient('test');
    const getMock = vi.spyOn(client, 'get');
    getMock.mockResolvedValue({
      data: SAMPLE_METRICS
    });
    const metricsResource = new MetricsResource(client);
    const metrics = await metricsResource.list();
    expect(metrics).toEqual(SAMPLE_METRICS);
    expect(getMock).toHaveBeenCalledWith('/runs/metrics');
  });
      
});