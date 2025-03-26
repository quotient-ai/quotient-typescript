import { describe, it, expect, vi } from 'vitest';
import { BaseQuotientClient } from '../../quotientai/client';
import { RunsResource } from '../../quotientai/resources/runs';
import { Run } from '../../quotientai/resources/runs';

const SAMPLE_RUNS = [
    {
        id: 'test',
        prompt: 'test',
        dataset: 'test',
        model: 'test',
        parameters: {},
        metrics: [],
        status: 'test',
        results: [],
        created_at: '2024-01-01',
        finished_at: '2024-01-01'
    },
    {
        id: 'test2',
        prompt: 'test2',
        dataset: 'test2',
        model: 'test2',
        parameters: {},
        metrics: [],
        status: 'test2',
        results: [],
        created_at: '2024-01-01',
        finished_at: '2024-01-01'
    }
]
describe('RunsResource', () => {
    it('should list runs', async () => {
        const client = new BaseQuotientClient('test');
        const runsResource = new RunsResource(client);
        const getMock = vi.spyOn(client, 'get');
        getMock.mockResolvedValue(SAMPLE_RUNS);
        const runs = await runsResource.list();
        expect(runs).toEqual(SAMPLE_RUNS.map(run => new Run(client, run)));
    });

    it('should get a run', async () => {
        const client = new BaseQuotientClient('test');
        const runsResource = new RunsResource(client);
        const getMock = vi.spyOn(client, 'get');
        getMock.mockResolvedValue(SAMPLE_RUNS[0]);
        const run = await runsResource.get('test');
        expect(run).toBeInstanceOf(Run);
        expect(run?.id).toBe('test');
        expect(run?.prompt).toBe('test');
        expect(run?.dataset).toBe('test');
        expect(run?.model).toBe('test');
        expect(run?.parameters).toEqual({});
        expect(run?.metrics).toEqual([]);
        expect(run?.results).toEqual([]);
        expect(run?.created_at).toEqual(new Date('2024-01-01'));
        expect(run?.finished_at).toEqual(new Date('2024-01-01'));
        expect(getMock).toHaveBeenCalledWith('/runs/test');
    });

    it('should create a run', async () => {
        const client = new BaseQuotientClient('test');
        const runsResource = new RunsResource(client);
        const postMock = vi.spyOn(client, 'post');
        postMock.mockResolvedValue(SAMPLE_RUNS[0]);
        const mockPrompt = { id: 'test', name: 'test', content: 'test', version: 1, user_prompt: 'test', created_at: new Date(), updated_at: new Date() };
        const mockDataset = { id: 'test', name: 'test', created_by: 'test', created_at: new Date(), updated_at: new Date() };
        const mockModel = { id: 'test', name: 'test', provider: { id: 'test', name: 'test' }, created_at: new Date() };
        const run = await runsResource.create(mockPrompt, mockDataset, mockModel, {}, []);
        expect(run).toBeInstanceOf(Run);
        expect(run?.id).toBe('test');
        expect(run?.prompt).toBe('test');
        expect(run?.dataset).toBe('test');
        expect(run?.model).toBe('test');
        expect(run?.parameters).toEqual({});
        expect(run?.metrics).toEqual([]);
        expect(run?.results).toEqual([]);
        expect(run?.created_at).toEqual(new Date('2024-01-01'));
        expect(run?.finished_at).toEqual(new Date('2024-01-01'));
        expect(postMock).toHaveBeenCalledWith('/runs', {
            prompt_id: 'test',
            dataset_id: 'test',
            model_id: 'test',
            parameters: {},
            metrics: []
        });
    });

    it('should compare runs with different datasets and raise an error', async () => {
        const client = new BaseQuotientClient('test');
        const runsResource = new RunsResource(client);
        
        const run1 = new Run(client, {
            ...SAMPLE_RUNS[0],
            dataset: 'dataset1'
        });
        
        const run2 = new Run(client, {
            ...SAMPLE_RUNS[0],
            dataset: 'dataset2'
        });

        await expect(runsResource.compare([run1, run2]))
            .rejects.toThrow('All runs must be on the same dataset to compare them');
    });

    it('should compare runs with different prompts and models and raise an error', async () => {
        const client = new BaseQuotientClient('test');
        const runsResource = new RunsResource(client);
        
        const run1 = new Run(client, {
            ...SAMPLE_RUNS[0],
            prompt: 'prompt1',
            model: 'model1'
        });
        
        const run2 = new Run(client, {
            ...SAMPLE_RUNS[0],
            prompt: 'prompt2',
            model: 'model2'
        });

        await expect(runsResource.compare([run1, run2]))
            .rejects.toThrow('All runs must be on the same prompt or model to compare them');
    });

    it('should compare runs with different prompts and the same model', async () => {
        const client = new BaseQuotientClient('test');
        const runsResource = new RunsResource(client);
        
        const run1 = new Run(client, {
            ...SAMPLE_RUNS[0],
            prompt: 'prompt1',
            model: 'model1',
            metrics: ['accuracy'],
            results: [
                { values: { accuracy: 0.8 }, id: '1', input: '', output: '', created_at: new Date('2024-01-01'), created_by: '', context: '', expected: '' }
            ]
        });
        
        const run2 = new Run(client, {
            ...SAMPLE_RUNS[0],
            prompt: 'prompt2',
            model: 'model1',
            metrics: ['accuracy'],
            results: [
                { values: { accuracy: 0.6 }, id: '2', input: '', output: '', created_at: new Date('2024-01-01'), created_by: '', context: '', expected: '' }
            ]
        });

        const comparison = await runsResource.compare([run1, run2]);
        expect(comparison).toEqual({
            accuracy: {
                avg: expect.any(Number),
                stddev: expect.any(Number)
            }
        });
        expect(comparison?.accuracy.avg).toBeCloseTo(0.2, 10);
        expect(comparison?.accuracy.stddev).toBeCloseTo(0, 10);
    });

    it('should compare runs with the same prompts and different models', async () => {
        const client = new BaseQuotientClient('test');
        const runsResource = new RunsResource(client);
        
        const run1 = new Run(client, {
            ...SAMPLE_RUNS[0],
            prompt: 'prompt1',
            model: 'model1',
            metrics: ['accuracy'],
            results: [
                { values: { accuracy: 0.9 }, id: '1', input: '', output: '', created_at: new Date('2024-01-01'), created_by: '', context: '', expected: '' }
            ]
        });
        
        const run2 = new Run(client, {
            ...SAMPLE_RUNS[0],
            prompt: 'prompt1',
            model: 'model2',
            metrics: ['accuracy'],
            results: [
                { values: { accuracy: 0.7 }, id: '2', input: '', output: '', created_at: new Date('2024-01-01'), created_by: '', context: '', expected: '' }
            ]
        });

        const comparison = await runsResource.compare([run1, run2]);
        expect(comparison).toEqual({
            accuracy: {
                avg: expect.any(Number),
                stddev: expect.any(Number)
            }
        });
        expect(comparison?.accuracy.avg).toBeCloseTo(0.2, 10);
    });

    it('should compare multiple runs with valid results', async () => {
        const client = new BaseQuotientClient('test');
        const runsResource = new RunsResource(client);
        
        const run1 = new Run(client, {
            ...SAMPLE_RUNS[0],
            id: 'run1',
            metrics: ['accuracy'],
            results: [
                { values: { accuracy: 0.9 }, id: '1', input: '', output: '', created_at: new Date('2024-01-01'), created_by: '', context: '', expected: '' }
            ]
        });
        
        const run2 = new Run(client, {
            ...SAMPLE_RUNS[0],
            id: 'run2',
            metrics: ['accuracy'],
            results: [
                { values: { accuracy: 0.7 }, id: '2', input: '', output: '', created_at: new Date('2024-01-01'), created_by: '', context: '', expected: '' }
            ]
        });

        const run3 = new Run(client, {
            ...SAMPLE_RUNS[0],
            id: 'run3',
            metrics: ['accuracy'],
            results: [
                { values: { accuracy: 0.8 }, id: '3', input: '', output: '', created_at: new Date('2024-01-01'), created_by: '', context: '', expected: '' }
            ]
        });

        const comparison = await runsResource.compare([run1, run2, run3]);
        expect(comparison).toEqual({
            run1: {
                accuracy: {
                    avg: expect.any(Number),
                    stddev: expect.any(Number)
                }
            },
            run2: {
                accuracy: {
                    avg: expect.any(Number),
                    stddev: expect.any(Number)
                }
            },
            run3: {
                accuracy: {
                    avg: expect.any(Number),
                    stddev: expect.any(Number)
                }
            }
        });

        // Check the actual values with toBeCloseTo
        expect(comparison?.run1.accuracy.avg).toBeCloseTo(0.2, 10);
        expect(comparison?.run2.accuracy.avg).toBeCloseTo(0.2, 10);
        expect(comparison?.run3.accuracy.avg).toBeCloseTo(0.2, 10);
        expect(comparison?.run1.accuracy.stddev).toBeCloseTo(0, 10);
        expect(comparison?.run2.accuracy.stddev).toBeCloseTo(0, 10);
        expect(comparison?.run3.accuracy.stddev).toBeCloseTo(0, 10);
    });

    it('should return null if only one run is provided', async () => {
        const client = new BaseQuotientClient('test');
        const runsResource = new RunsResource(client);
        
        const run = new Run(client, {
            ...SAMPLE_RUNS[0],
            metrics: ['accuracy'],
            results: [
                { values: { accuracy: 0.9 }, id: '1', input: '', output: '', created_at: new Date('2024-01-01'), created_by: '', context: '', expected: '' }
            ]
        });

        // Explicitly await the result and store it
        const result = await runsResource.compare([run]);
        
        // Verify it's exactly null (not undefined)
        expect(result).toBe(null);
    });

    it('should return null when summarizing a run with no results', () => {
        const client = new BaseQuotientClient('test');
        const run = new Run(client, {
            ...SAMPLE_RUNS[0],
            metrics: ['accuracy'],
            results: []
        });

        const summary = run.summarize();
        expect(summary).toBe(null);
    });

    it('should correctly summarize a run with results', () => {
        const client = new BaseQuotientClient('test');
        const run = new Run(client, {
            ...SAMPLE_RUNS[0],
            metrics: ['accuracy'],
            results: [
                { values: { accuracy: 0.8 }, id: '1', input: '', output: '', created_at: new Date('2024-01-01'), created_by: '', context: '', expected: '' },
                { values: { accuracy: 0.6 }, id: '2', input: '', output: '', created_at: new Date('2024-01-01'), created_by: '', context: '', expected: '' },
                { values: { accuracy: 0.7 }, id: '3', input: '', output: '', created_at: new Date('2024-01-01'), created_by: '', context: '', expected: '' }
            ]
        });

        const summary = run.summarize(2, 2);
        expect(summary).not.toBe(null);
        expect(summary?.metrics.accuracy.avg).toBeCloseTo(0.7, 10);
        expect(summary?.metrics.accuracy.stddev).toBeCloseTo(0.0816, 4);
        const bestResults = (summary as any)['best_2'];
        const worstResults = (summary as any)['worst_2'];
        expect(bestResults).toBeDefined();
        expect(worstResults).toBeDefined();
        if (bestResults && worstResults) {
            expect(bestResults).toHaveLength(2);
            expect(worstResults).toHaveLength(2);
            expect(bestResults[0].values.accuracy).toBe(0.8);
            expect(bestResults[1].values.accuracy).toBe(0.7);
            expect(worstResults[0].values.accuracy).toBe(0.7);
            expect(worstResults[1].values.accuracy).toBe(0.6);
        }
    });

    it('should handle zero values for best_n and worst_n', () => {
        const client = new BaseQuotientClient('test');
        const run = new Run(client, {
            ...SAMPLE_RUNS[0],
            metrics: ['accuracy'],
            results: [
                { values: { accuracy: 0.8 }, id: '1', input: '', output: '', created_at: new Date('2024-01-01'), created_by: '', context: '', expected: '' },
                { values: { accuracy: 0.6 }, id: '2', input: '', output: '', created_at: new Date('2024-01-01'), created_by: '', context: '', expected: '' },
                { values: { accuracy: 0.7 }, id: '3', input: '', output: '', created_at: new Date('2024-01-01'), created_by: '', context: '', expected: '' }
            ]
        });

        const summary = run.summarize(0, 0);
        expect(summary).not.toBe(null);
        expect(summary?.metrics.accuracy.avg).toBeCloseTo(0.7, 10);
        expect(summary?.metrics.accuracy.stddev).toBeCloseTo(0.0816, 4);
        expect((summary as any)['best_0']).toBeUndefined();
        expect((summary as any)['worst_0']).toBeUndefined();
    });

    it('should handle null finished_at in response', () => {
        const client = new BaseQuotientClient('test');
        const run = new Run(client, {
            ...SAMPLE_RUNS[0],
            finished_at: null
        });
        expect(run.finished_at).toBeUndefined();
    });
});

