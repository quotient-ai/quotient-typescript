import { describe, it, expect, vi } from 'vitest';
import { DatasetsResource, DatasetRowResponse } from '../../quotientai/resources/datasets';
import { BaseQuotientClient } from '../../quotientai/client';

describe('DatasetsResource', () => {
  it('should list datasets', async () => {
    const client = new BaseQuotientClient('test');
    const mockDate = new Date('2024-01-01').toISOString();
    
    const getMock = vi.spyOn(client, 'get');
    getMock.mockImplementation((path: string) => {
      if (path === '/datasets') {
        return Promise.resolve([{
          id: 'test_id',
          name: 'test_dataset',
          created_by: 'test_user',
          created_at: mockDate,
          updated_at: mockDate,
          description: "test description"
        }]);
      }
      if (path === '/datasets/test_id/rows') {
        return Promise.resolve([{
          id: 'test_row_id',
          dataset_id: 'test_id',
          created_at: mockDate,
          updated_at: mockDate,
          input: 'test input',
          context: 'test context',
          expected: 'test expected',
          annotation: 'test annotation',
          annotation_note: 'test note',
          created_by: 'test_user'
        }]);
      }
      return Promise.resolve([]);
    });
    
    const datasetsResource = new DatasetsResource(client);
    const datasets = await datasetsResource.list();
    
    expect(datasets).toBeDefined();
    expect(datasets).toHaveLength(1);
    expect(datasets[0]).toEqual({
      id: 'test_id',
      name: 'test_dataset',
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate),
      description: "test description",
      rows: undefined
    });
    expect(client.get).toHaveBeenCalledWith('/datasets');
  });

  it('should list datasets with rows', async () => {
    const client = new BaseQuotientClient('test');
    const mockDate = new Date('2024-01-01').toISOString();
    
    const getMock = vi.spyOn(client, 'get');
    getMock.mockImplementation((path: string) => {
      if (path === '/datasets') {
        return Promise.resolve([{
          id: 'test_id',
          name: 'test_dataset',
          created_by: 'test_user',
          created_at: mockDate,
          updated_at: mockDate,
          description: 'test description'
        }]);
      }
      if (path === '/datasets/test_id/rows') {
        return Promise.resolve([{
          id: 'test_row_id',
          input: 'test input',
          context: 'test context',
          expected: 'test expected',
          annotation: 'test annotation',
          annotation_note: 'test note',
          created_by: 'test_user',
          created_at: mockDate,
          updated_at: mockDate
        }]);
      }
      return Promise.resolve([]);
    });
    
    const datasetsResource = new DatasetsResource(client);
    const datasets = await datasetsResource.list({ includeRows: true });

    expect(datasets).toBeDefined();
    expect(datasets).toHaveLength(1);
    expect(datasets[0].rows).toBeDefined();
    expect(datasets[0].rows).toHaveLength(1);
    expect(datasets[0].rows?.[0]).toEqual({
      id: 'test_row_id',
      input: 'test input',
      context: 'test context',
      expected: 'test expected',
      metadata: {
        annotation: 'test annotation',
        annotation_note: 'test note'
      },
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate)
    });
    expect(client.get).toHaveBeenCalledWith('/datasets');
    expect(client.get).toHaveBeenCalledWith('/datasets/test_id/rows');
  });

  it('should convert dates to Date objects', async () => {
    const client = new BaseQuotientClient('test');
    const mockDate = new Date('2024-01-01').toISOString();

    const getMock = vi.spyOn(client, 'get');
    getMock.mockImplementation((path: string) => {
      if (path === '/datasets') {
        return Promise.resolve([{
          id: 'test_id',
          name: 'test_dataset',
          created_by: 'test_user',
          created_at: mockDate,
          updated_at: mockDate,
          description: 'test description'
        }]);
      }
      return Promise.resolve([]);
    });

    const datasetsResource = new DatasetsResource(client);
    const datasets = await datasetsResource.list();

    expect(datasets).toBeDefined();
    expect(datasets).toHaveLength(1);
    expect(datasets[0].created_at).toBeInstanceOf(Date);
    expect(datasets[0].updated_at).toBeInstanceOf(Date);
  })

  it('should convert rows dates to Date objects', async () => {
    const client = new BaseQuotientClient('test');
    const mockDate = new Date('2024-01-01').toISOString();

    const getMock = vi.spyOn(client, 'get');
    getMock.mockImplementation((path: string) => {
      if (path === '/datasets') {
        return Promise.resolve([{
          id: 'test_id',
          name: 'test_dataset',
          created_by: 'test_user',
          created_at: mockDate,
          updated_at: mockDate,
          description: 'test description'
        }]);
      }
      if (path === '/datasets/test_id/rows') {
        return Promise.resolve([{
          id: 'test_row_id',
          dataset_id: 'test_id',
          created_at: mockDate,
          updated_at: mockDate,
          input: 'test input',
          context: 'test context',
          expected: 'test expected',
          annotation: 'test annotation',
          annotation_note: 'test note',
          created_by: 'test_user'
        }]);
      }
      return Promise.resolve([]);
    });

    const datasetsResource = new DatasetsResource(client);
    const datasets = await datasetsResource.list({ includeRows: true });

    expect(datasets).toBeDefined();
    expect(datasets).toHaveLength(1);
    expect(datasets[0].rows?.[0].created_at).toBeInstanceOf(Date);
    expect(datasets[0].rows?.[0].updated_at).toBeInstanceOf(Date);
  })

  it('should get a dataset', async () => {
    const client = new BaseQuotientClient('test');
    const mockDate = new Date('2024-01-01').toISOString();

    const getMock = vi.spyOn(client, 'get');
    getMock.mockImplementation((path: string) => {
      if (path === '/datasets/test_id') {
        return Promise.resolve({
          id: 'test_id',
          name: 'test_dataset',
          created_by: 'test_user',
          created_at: mockDate,
          updated_at: mockDate,
          description: 'test description',
          dataset_rows: [{
            id: 'test_row_id',
            input: 'test input',
            context: 'test context',
            expected: 'test expected',
            annotation: 'test annotation',
            annotation_note: 'test note',
            created_by: 'test_user',
            created_at: mockDate,
            updated_at: mockDate
          }]
        });
      }
      return Promise.resolve([]);
    });

    const datasetsResource = new DatasetsResource(client);
    const dataset = await datasetsResource.get('test_id');

    expect(dataset).toBeDefined();
    expect(dataset.created_at).toBeInstanceOf(Date);
    expect(dataset.updated_at).toBeInstanceOf(Date);
    expect(dataset.rows?.[0].created_at).toBeInstanceOf(Date);
    expect(dataset.rows?.[0].updated_at).toBeInstanceOf(Date);
  })

  it('should create a dataset without rows', async () => {
    const client = new BaseQuotientClient('test');
    const mockDate = new Date('2024-01-01').toISOString();

    const postMock = vi.spyOn(client, 'post');
    postMock.mockImplementation((path: string) => {
      if (path === '/datasets') {
        return Promise.resolve({
          id: 'test_id',
          name: 'test_dataset',
          created_by: 'test_user',
          created_at: mockDate,
          updated_at: mockDate,
          description: 'test description'
        });
      }
      return Promise.resolve([]);
    });

    const datasetsResource = new DatasetsResource(client);
    const dataset = await datasetsResource.create('test_dataset', 'test description');
    
    expect(dataset).toBeDefined();
    expect(dataset.rows).toEqual([]);
    expect(client.post).toHaveBeenCalledWith('/datasets', {
      name: 'test_dataset',
      description: 'test description'
    });
  });

  it('should create a dataset with rows', async () => {
    const client = new BaseQuotientClient('test');
    const mockDate = new Date('2024-01-01').toISOString();

    const postMock = vi.spyOn(client, 'post');
    postMock.mockImplementation((path: string) => {
      if (path === '/datasets') {
        return Promise.resolve({
          id: 'test_id',
          name: 'test_dataset',
          created_by: 'test_user',
          created_at: mockDate,
          updated_at: mockDate,
          description: 'test description'
        });
      }
      if (path === '/datasets/test_id/dataset_rows/batch') {
        return Promise.resolve([{
          id: 'test_row_id',
          input: 'test input',
          context: 'test context',
          expected: 'test expected',
          annotation: 'test annotation',
          annotation_note: 'test note',
          created_by: 'test_user',
          created_at: mockDate,
          updated_at: mockDate
        }]);
      }
      return Promise.resolve([]);
    });

    const datasetsResource = new DatasetsResource(client);
    const dataset = await datasetsResource.create('test_dataset', 'test description', [{
      id: 'test_row_id',
      input: 'test input',
      context: 'test context',
      expected: 'test expected',
      metadata: {   
        annotation: 'test annotation',
        annotation_note: 'test note'
      },
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate)
    }]);

    expect(dataset).toBeDefined();
    expect(dataset.rows).toEqual([{
      id: 'test_row_id',
      input: 'test input',
      context: 'test context',
      expected: 'test expected',
      metadata: {
        annotation: 'test annotation',
        annotation_note: 'test note'
      },
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate)
    }]);

    expect(client.post).toHaveBeenCalledWith('/datasets', {
      name: 'test_dataset',
      description: 'test description'
    });
    expect(client.post).toHaveBeenCalledWith('/datasets/test_id/dataset_rows/batch', {
      rows: expect.any(Array)
    });
  });

  it('should update a dataset', async () => {
    const client = new BaseQuotientClient('test');
    const mockDate = new Date('2024-01-01').toISOString();

    const patchMock = vi.spyOn(client, 'patch');
    patchMock.mockImplementation((path: string) => {
      if (path === '/datasets/test_id') {
        return Promise.resolve({
          id: 'test_id',
          name: 'test_dataset',
          created_by: 'test_user',
          created_at: mockDate,
          updated_at: mockDate,
          description: 'test description',
          dataset_rows: []
        });
      }
      return Promise.resolve([]);
    });

    const datasetsResource = new DatasetsResource(client);
    const dataset = await datasetsResource.update({
      id: 'test_id',
      name: 'test_dataset',
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate),
      description: 'test description'
    }, 'test_dataset', 'test description');

    expect(dataset).toBeDefined();
    expect(dataset.rows).toEqual([]);
    expect(client.patch).toHaveBeenCalledWith('/datasets/test_id', {
      name: 'test_dataset',
      description: 'test description'
    });
  });

  it('should update a dataset with rows', async () => {
    const client = new BaseQuotientClient('test');
    const mockDate = new Date('2024-01-01').toISOString();

    const patchMock = vi.spyOn(client, 'patch');
    patchMock.mockImplementation((path: string) => {
      if (path === '/datasets/test_id') {
        return Promise.resolve({
          id: 'test_id',
          name: 'test_dataset',
          created_by: 'test_user',
          created_at: mockDate,
          updated_at: mockDate,
          description: 'test description',
          dataset_rows: [{
            id: 'test_row_id',
            input: 'test input',
            context: 'test context',
            expected: 'test expected',
            annotation: 'test annotation',
            annotation_note: 'test note',
            created_by: 'test_user',
            created_at: mockDate,
            updated_at: mockDate
          }]
        });
      }
      return Promise.resolve([]);
    });
    
    const datasetsResource = new DatasetsResource(client);
    const dataset = await datasetsResource.update({
      id: 'test_id',
      name: 'test_dataset',
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate),
      description: 'test description',
      rows: [{
        id: 'test_row_id',
        input: 'test input',
        context: 'test context',
        expected: 'test expected',
        metadata: {
          annotation: 'test annotation',
          annotation_note: 'test note'
        },
        created_by: 'test_user',
        created_at: new Date(mockDate),
        updated_at: new Date(mockDate)
      }]
    }, 'test_dataset', 'test description', [{
      id: 'test_row_id',
      input: 'test input',
      context: 'test context',
      expected: 'test expected',
      metadata: {
        annotation: 'test annotation',
        annotation_note: 'test note'
      },
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate)
    }]);

    expect(dataset).toBeDefined();
    expect(dataset.rows).toEqual([{
      id: 'test_row_id',
      input: 'test input',
      context: 'test context',
      expected: 'test expected',
      metadata: {
        annotation: 'test annotation',
        annotation_note: 'test note'
      },
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate)
    }]);

    expect(client.patch).toHaveBeenCalledWith('/datasets/test_id', {
      name: 'test_dataset',
      description: 'test description',
      rows: expect.any(Array)
    });
  });

  it('should append rows to a dataset', async () => {
    const client = new BaseQuotientClient('test');
    const mockDate = new Date('2024-01-01').toISOString();

    const postMock = vi.spyOn(client, 'post');
    let attemptCount = 0;
    postMock.mockImplementation((path: string) => {
      if (path === '/datasets/test_id/dataset_rows/batch') {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new Error('Test error'));
        }
        return Promise.resolve([{
          id: 'new_row_id',
          input: 'test input',
          context: 'test context',
          expected: 'test expected',
          annotation: 'test annotation',
          annotation_note: 'test note',
          created_by: 'test_user',
          created_at: mockDate,
          updated_at: mockDate
        }]);
      }
      return Promise.resolve([]);
    });

    const datasetsResource = new DatasetsResource(client);
    const dataset = await datasetsResource.append({
      id: 'test_id',
      name: 'test_dataset',
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate),
      description: 'test description',
    }, [{
      id: 'new_row_id',
      input: 'test input',
      context: 'test context',
      expected: 'test expected',
      metadata: {
        annotation: 'test annotation',
        annotation_note: 'test note'
      },
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate)
    }]);

    expect(dataset).toBeDefined();
    
    expect(dataset.rows).toEqual([
        {
            id: 'new_row_id',
            input: 'test input',
            context: 'test context',
            expected: 'test expected',
            metadata: {
              annotation: 'test annotation',
              annotation_note: 'test note'
            },
            created_by: 'test_user',
            created_at: new Date(mockDate),
            updated_at: new Date(mockDate)
        }
    ]);

    expect(client.post).toHaveBeenCalledWith('/datasets/test_id/dataset_rows/batch', {
      rows: expect.any(Array)
    });
  });

  it ('should append rows to a dataset that already has rows', async () => {
    const client = new BaseQuotientClient('test');
    const mockDate = new Date('2024-01-01').toISOString();

    const postMock = vi.spyOn(client, 'post');
    let attemptCount = 0;
    postMock.mockImplementation((path: string) => {
      if (path === '/datasets/test_id/dataset_rows/batch') {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new Error('Test error'));
        }
        return Promise.resolve([{
          id: 'new_row_id',
          input: 'test input',
          context: 'test context',
          expected: 'test expected',
          annotation: 'test annotation',
          annotation_note: 'test note',
          created_by: 'test_user',
          created_at: mockDate,
          updated_at: mockDate
        }]);
      }
      return Promise.resolve([]);
    });

    const datasetsResource = new DatasetsResource(client);
    const dataset = await datasetsResource.append({
      id: 'test_id',
      name: 'test_dataset',
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate),
      description: 'test description',
      rows: [{
        id: 'existing_row_id',
        input: 'test input',
        context: 'test context',
        expected: 'test expected',
        metadata: {
          annotation: 'test annotation',
          annotation_note: 'test note'
        },
        created_by: 'test_user',
        created_at: new Date(mockDate),
        updated_at: new Date(mockDate)
      }]
    }, [{
      id: 'new_row_id',
      input: 'test input',
      context: 'test context',
      expected: 'test expected',
      metadata: {
        annotation: 'test annotation',
        annotation_note: 'test note'
      },
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate)
    }]);

    expect(dataset).toBeDefined();
    
    expect(dataset.rows).toEqual([
      {
        id: 'existing_row_id',
        input: 'test input',
        context: 'test context',
        expected: 'test expected',
        metadata: {
          annotation: 'test annotation',
          annotation_note: 'test note'
        },
        created_by: 'test_user',
        created_at: new Date(mockDate),
        updated_at: new Date(mockDate)
      },
      {
        id: 'new_row_id',
        input: 'test input',
        context: 'test context',
        expected: 'test expected',
        metadata: {
          annotation: 'test annotation',
          annotation_note: 'test note'
        },
        created_by: 'test_user',
        created_at: new Date(mockDate),
        updated_at: new Date(mockDate)
      }
    ]);

    expect(client.post).toHaveBeenCalledWith('/datasets/test_id/dataset_rows/batch', {
      rows: expect.any(Array)
    });
  });

  it('should delete rows if rows are passed as an argument', async () => {
    const client = new BaseQuotientClient('test');
    const mockDate = new Date('2024-01-01').toISOString();

    const patchMock = vi.spyOn(client, 'patch');
    patchMock.mockImplementation((path: string) => {
      if (path === '/datasets/test_id/dataset_rows/test_row_id') {
        return Promise.resolve({});
      }
      return Promise.resolve([]);
    });

    const datasetsResource = new DatasetsResource(client);
    await datasetsResource.delete({
      id: 'test_id',
      name: 'test_dataset',
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate),
      description: 'test description'
    }, [{
      id: 'test_row_id',
      input: 'test input',
      context: 'test context',
      expected: 'test expected',
      metadata: {
        annotation: 'test annotation',
        annotation_note: 'test note'
      },
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate)
    }]);

    expect(patchMock).toHaveBeenCalledWith('/datasets/test_id/dataset_rows/test_row_id', {
      id: 'test_row_id',
      input: 'test input',
      context: 'test context',
      expected: 'test expected',
      annotation: 'test annotation',
      annotation_note: 'test note',
      is_deleted: true
    });

  })

  it('should delete a dataset if no rows are passed as an argument', async () => {
    const client = new BaseQuotientClient('test');
    const mockDate = new Date('2024-01-01').toISOString();

    const patchMock = vi.spyOn(client, 'patch');
    patchMock.mockImplementation((path: string) => {
      if (path === '/datasets/test_id') {
        return Promise.resolve({});
      }
      return Promise.resolve([]);
    });

    const datasetsResource = new DatasetsResource(client);
    await datasetsResource.delete({
      id: 'test_id',
      name: 'test_dataset',
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate),
      description: 'test description'
    });

    expect(patchMock).toHaveBeenCalledWith('/datasets/test_id', {
      name: 'test_dataset',
      description: 'test description',
      is_deleted: true
    });
  });

  it('should batch create rows', async () => {
    const client = new BaseQuotientClient('test');
    const mockDate = new Date('2024-01-01').toISOString();

    const postMock = vi.spyOn(client, 'post');
    postMock.mockImplementation((path: string) => {
      if (path === '/datasets/test_id/dataset_rows/batch') {
        return Promise.resolve([{
          id: 'new_row_id',
          input: 'test input',
          context: 'test context',
          expected: 'test expected',
          annotation: 'test annotation',
          annotation_note: 'test note',
          created_by: 'test_user',
          created_at: mockDate,
          updated_at: mockDate
        }]);
      }
      return Promise.resolve([]);
    });
    let rowResponses: DatasetRowResponse[] = [];
    const datasetsResource = new DatasetsResource(client);
    await datasetsResource.batchCreateRows('test_id', [{
      id: 'new_row_id',
      input: 'test input',
      context: 'test context',
      expected: 'test expected',
      metadata: {
        annotation: 'test annotation',
        annotation_note: 'test note'
      },
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate)
    }], rowResponses);

    expect(rowResponses).toEqual([{
      id: 'new_row_id',
      input: 'test input',
      context: 'test context',
      expected: 'test expected',
      annotation: 'test annotation',
      annotation_note: 'test note',
      created_by: 'test_user',
      created_at: mockDate,
      updated_at: mockDate
    }]);

    expect(client.post).toHaveBeenCalledWith('/datasets/test_id/dataset_rows/batch', {
      rows: expect.any(Array)
    });
  });

  it('should recursively retry if the initial request fails', async () => {
    const client = new BaseQuotientClient('test');
    const mockDate = new Date('2024-01-01').toISOString();

    const postMock = vi.spyOn(client, 'post');
    let attemptCount = 0;
    postMock.mockImplementation((path: string) => {
      if (path === '/datasets/test_id/dataset_rows/batch') {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new Error('Test error'));
        }
        return Promise.resolve([{
          id: 'new_row_id',
          input: 'test input',
          context: 'test context',
          expected: 'test expected',
          annotation: 'test annotation',
          annotation_note: 'test note',
          created_by: 'test_user',
          created_at: mockDate,
          updated_at: mockDate
        }]);
      }
      return Promise.resolve([]);
    });

    const datasetsResource = new DatasetsResource(client);
    await datasetsResource.batchCreateRows('test_id', [{
      id: 'new_row_id',
      input: 'test input',
      context: 'test context',
      expected: 'test expected',
      metadata: {
        annotation: 'test annotation',
        annotation_note: 'test note'
      },
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate)
    }], []);

    expect(postMock).toHaveBeenCalledWith('/datasets/test_id/dataset_rows/batch', {
      rows: expect.any(Array)
    });

    expect(postMock).toHaveBeenCalledTimes(2);
    expect(postMock).toHaveBeenNthCalledWith(2, '/datasets/test_id/dataset_rows/batch', {
      rows: expect.any(Array)
    });
  });

  it('should fail if batch size is one and the initial request fails', async () => {
    const client = new BaseQuotientClient('test');
    const mockDate = new Date('2024-01-01').toISOString();

    const postMock = vi.spyOn(client, 'post');
    postMock.mockRejectedValue(new Error('Test error'));

    const datasetsResource = new DatasetsResource(client);
    await expect(datasetsResource.batchCreateRows('test_id', [{
      id: 'new_row_id',
      input: 'test input',
      context: 'test context',
      expected: 'test expected',
      metadata: {
        annotation: 'test annotation',
        annotation_note: 'test note'
      },
      created_by: 'test_user',
      created_at: new Date(mockDate),
      updated_at: new Date(mockDate)
    }], [], 1)).rejects.toThrow('Test error');

    expect(postMock).toHaveBeenCalledWith('/datasets/test_id/dataset_rows/batch', {
      rows: expect.any(Array)
    });
    expect(postMock).toHaveBeenCalledTimes(1);
  });

});