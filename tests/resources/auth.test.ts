import { describe, it, expect } from 'vitest';
import { AuthResource } from '../../quotientai/resources/auth';
import { BaseQuotientClient } from '../../quotientai/client';
import { vi } from 'vitest';

describe('QuotientAuth', () => {
    it('should be defined', () => {
        expect(AuthResource).toBeDefined();
    });

    it('should authenticate', async () => {
        const client = new BaseQuotientClient('test');
        vi.spyOn(client, 'get').mockResolvedValue({ id: 'test_id', email: 'test@test.com' });
        const authResource = new AuthResource(client);
        
        const response = await authResource.authenticate();
        expect(response).toEqual({ id: 'test_id', email: 'test@test.com' });
    });
});