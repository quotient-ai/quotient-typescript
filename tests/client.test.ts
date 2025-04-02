import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseQuotientClient } from '../quotientai/client';
import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';
import * as os from 'os';

vi.mock('fs', () => {
    return {
        existsSync: vi.fn().mockReturnValue(false),
        readFileSync: vi.fn().mockReturnValue('{}'),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn()
    };
});

vi.mock('jsonwebtoken', () => {
    return {
        decode: vi.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 })
    };
});

vi.mock('os', () => ({
    homedir: vi.fn().mockReturnValue('/home/user')
}));

describe('BaseQuotientClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with the correct api key', () => {
        const client = new BaseQuotientClient('test_api_key');
        const privateClient = client as any;
        
        expect(privateClient.apiKey).toBe('test_api_key');
        expect(privateClient.token).toBeNull();
        expect(privateClient.tokenExpiry).toBe(0);
    });
    
    it('should properly process and store tokens from a response', async () => {
        const client = new BaseQuotientClient('test_api_key');
        const privateClient = client as any;
        
        // Spy on the saveToken method
        const saveTokenSpy = vi.spyOn(privateClient, 'saveToken');
        
        const response = {
            data: {
                token: 'test_token',
                expires_at: Date.now() + 1000 * 60 * 60 * 24 // 1 day from now
            },
            headers: {
                'x-jwt-token': 'test_token'
            }
        };
        
        vi.mocked(fs.existsSync).mockReturnValue(false);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(response));
        
        await privateClient.handleResponse(response);
        
        expect(privateClient.token).toBe('test_token');
        expect(privateClient.tokenExpiry).toBeCloseTo(Math.floor(Date.now() / 1000) + 3600, -1);
        expect(saveTokenSpy).toHaveBeenCalledOnce();
        expect(saveTokenSpy).toHaveBeenCalledWith('test_token', expect.any(Number));
    });
    
    it('should save the token to the file system', async () => {
        const client = new BaseQuotientClient('test_api_key');
        const privateClient = client as any;
        
        // Mock fs operations
        const mkdirSpy = vi.spyOn(fs, 'mkdirSync');
        const writeSpy = vi.spyOn(fs, 'writeFileSync');
        
        const response = {
            data: {
                token: 'test_token',
                expires_at: Date.now() + 1000 * 60 * 60 * 24 // 1 day from now
            },
            headers: {
                'x-jwt-token': 'test_token'
            }
        };
        
        await privateClient.handleResponse(response);
        
        // Verify token is in memory
        expect(privateClient.token).toBe('test_token');
        expect(privateClient.tokenExpiry).toBeCloseTo(Math.floor(Date.now() / 1000) + 3600, -1);
        
        // Verify file system operations
        expect(mkdirSpy).toHaveBeenCalledWith(expect.any(String), { recursive: true });
        expect(writeSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.stringContaining('"token":"test_token"')
        );
        const writeCall = writeSpy.mock.calls[0];
        const writtenData = writeCall[1] as string;
        expect(typeof JSON.parse(writtenData).expires_at).toBe('number');
    });

    it('should read the token from the file system', async () => {
        const client = new BaseQuotientClient('test_api_key');
        const privateClient = client as any;
        
        const mockExpiry = Math.floor(Date.now() / 1000) + 3600;
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ 
            token: 'test_token', 
            expires_at: mockExpiry 
        }));

        await privateClient.loadToken();

        expect(privateClient.token).toBe('test_token');
        expect(privateClient.tokenExpiry).toBe(mockExpiry);
    });

    it('should handle token loading failures gracefully', async () => {
        const client = new BaseQuotientClient('test_api_key');
        const privateClient = client as any;
        
        // Reset token state
        privateClient.token = null;
        privateClient.tokenExpiry = 0;
        
        // Mock file exists but reading fails
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementationOnce(() => {
            throw new Error('Failed to read file');
        });

        privateClient.loadToken();

        // Token should remain null if loading fails
        expect(privateClient.token).toBeNull();
        expect(privateClient.tokenExpiry).toBe(0);
    });

    it('should correctly validate token status', () => {
        const client = new BaseQuotientClient('test_api_key');
        const privateClient = client as any;
        
        // Test valid token
        privateClient.token = 'valid_token';
        privateClient.tokenExpiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        expect(privateClient.isTokenValid()).toBe(true);
        
        // Test expired token
        privateClient.token = 'expired_token';
        privateClient.tokenExpiry = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
        expect(privateClient.isTokenValid()).toBe(false);
        
        // Test token expiring soon (within 5-minute buffer)
        privateClient.token = 'expiring_token';
        privateClient.tokenExpiry = Math.floor(Date.now() / 1000) + 240; // 4 minutes from now
        expect(privateClient.isTokenValid()).toBe(false);
        
        // Test null token
        privateClient.token = null;
        privateClient.tokenExpiry = Math.floor(Date.now() / 1000) + 3600;
        expect(privateClient.isTokenValid()).toBe(false);
    });

    it('should update auth header with valid token', () => {
        const client = new BaseQuotientClient('test_api_key');
        const privateClient = client as any;
        
        // Test valid token
        privateClient.token = 'valid_token';
        privateClient.tokenExpiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        privateClient.updateAuthHeader();
        expect(privateClient.client.defaults.headers.common['Authorization']).toBe('Bearer valid_token');
        
        // Test expired token
        privateClient.token = 'expired_token';
        privateClient.tokenExpiry = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
        privateClient.updateAuthHeader();
        expect(privateClient.client.defaults.headers.common['Authorization']).toBe('Bearer test_api_key');
        
        // Test null token
        privateClient.token = null;
        privateClient.tokenExpiry = Math.floor(Date.now() / 1000) + 3600;
        privateClient.updateAuthHeader();
        expect(privateClient.client.defaults.headers.common['Authorization']).toBe('Bearer test_api_key');
        
        // Test token expiring soon (within 5-minute buffer)
        privateClient.token = 'expiring_token';
        privateClient.tokenExpiry = Math.floor(Date.now() / 1000) + 240; // 4 minutes from now
        privateClient.updateAuthHeader();
        expect(privateClient.client.defaults.headers.common['Authorization']).toBe('Bearer test_api_key');
    });
    

    it('should handle token directory fallbacks', () => {
        // Mock os.homedir to throw
        vi.mocked(os.homedir).mockImplementation(() => {
            throw new Error('homedir not available');
        });

        // First test: when /root exists
        vi.mocked(fs.existsSync).mockReturnValueOnce(true);
        let client = new BaseQuotientClient('test_api_key');
        let privateClient = client as any;
        expect(privateClient.tokenPath).toContain('/root/.quotient/auth_token.json');

        // Second test: when /root doesn't exist
        vi.mocked(fs.existsSync).mockReturnValueOnce(false);
        client = new BaseQuotientClient('test_api_key');
        privateClient = client as any;
        expect(privateClient.tokenPath).toContain(process.cwd() + '/.quotient/auth_token.json');

        // Reset the mock to test homedir success case
        vi.mocked(os.homedir).mockReturnValue('/home/user');
        client = new BaseQuotientClient('test_api_key');
        privateClient = client as any;
        expect(privateClient.tokenPath).toContain('/home/user/.quotient/auth_token.json');
    });

    it('should handle successful JWT decoding', async () => {
        const client = new BaseQuotientClient('test_api_key');
        const privateClient = client as any;
        
        const mockExpiry = Math.floor(Date.now() / 1000) + 3600;
        vi.mocked(jwt.decode).mockReturnValueOnce({ exp: mockExpiry });
        
        const response = {
            data: {},
            headers: {
                'x-jwt-token': 'valid_jwt_token'
            }
        };
        
        await privateClient.handleResponse(response);
        
        expect(privateClient.token).toBe('valid_jwt_token');
        expect(privateClient.tokenExpiry).toBe(mockExpiry);
    });

    it('should handle JWT tokens without expiration', async () => {
        const client = new BaseQuotientClient('test_api_key');
        const privateClient = client as any;
        
        // Mock JWT decode to return token without exp
        vi.mocked(jwt.decode).mockReturnValueOnce({});
        
        const response = {
            data: {},
            headers: {
                'x-jwt-token': 'token_without_exp'
            }
        };
        
        const beforeTime = Math.floor(Date.now() / 1000);
        await privateClient.handleResponse(response);
        
        expect(privateClient.token).toBe('token_without_exp');
        // Should default to 1 hour from now
        expect(privateClient.tokenExpiry).toBeGreaterThanOrEqual(beforeTime + 3600);
        expect(privateClient.tokenExpiry).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 3600);
    });

    it('should handle JWT decode failures', async () => {
        const client = new BaseQuotientClient('test_api_key');
        const privateClient = client as any;
        
        // Save initial state
        const initialToken = privateClient.token;
        const initialExpiry = privateClient.tokenExpiry;
        
        // Mock JWT decode to throw
        vi.mocked(jwt.decode).mockImplementationOnce(() => {
            throw new Error('Invalid token');
        });
        
        const response = {
            data: {},
            headers: {
                'x-jwt-token': 'invalid_jwt_token'
            }
        };
        
        await privateClient.handleResponse(response);
        
        // Verify state remains unchanged after failure
        expect(privateClient.token).toBe(initialToken);
        expect(privateClient.tokenExpiry).toBe(initialExpiry);
    });

    it('should handle directory creation failures', async () => {
        const client = new BaseQuotientClient('test_api_key');
        const privateClient = client as any;
        
        // Mock mkdirSync to throw
        vi.mocked(fs.mkdirSync).mockImplementationOnce(() => {
            throw new Error('Permission denied');
        });

        // Spy on console.error
        const consoleErrorSpy = vi.spyOn(console, 'error');

        // Attempt to save token
        privateClient.saveToken('test_token', Math.floor(Date.now() / 1000) + 3600);

        // Verify token is still set in memory even though file save failed
        expect(privateClient.token).toBe('test_token');
        expect(privateClient.tokenExpiry).toBe(Math.floor(Date.now() / 1000) + 3600);
        
        // Verify error was logged
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Could not create directory for token')
        );
    });

    it('should handle GET requests correctly', async () => {
        const client = new BaseQuotientClient('test_api_key');
        const privateClient = client as any;
        
        const mockResponse = { data: { result: 'success' } };
        privateClient.client.get = vi.fn().mockResolvedValue(mockResponse);
        
        const result = await client.get('/test', { param: 'value' }, 1000);
        
        expect(privateClient.client.get).toHaveBeenCalledWith(
            '/test',
            { params: { param: 'value' }, timeout: 1000 }
        );
        expect(result).toBe(mockResponse.data);
    });

    it('should handle POST requests and filter null values', async () => {
        const client = new BaseQuotientClient('test_api_key');
        const privateClient = client as any;
        
        const mockResponse = { data: { result: 'success' } };
        privateClient.client.post = vi.fn().mockResolvedValue(mockResponse);
        
        const data = {
            valid: 'value',
            nullValue: null,
            nested: { valid: true }
        };
        
        const result = await client.post('/test', data, 1000);
        
        expect(privateClient.client.post).toHaveBeenCalledWith(
            '/test',
            { valid: 'value', nested: { valid: true } },
            { timeout: 1000 }
        );
        expect(result).toBe(mockResponse.data);
    });

    it('should handle POST requests with array data', async () => {
        const client = new BaseQuotientClient('test_api_key');
        const privateClient = client as any;
        
        const mockResponse = { data: { result: 'success' } };
        privateClient.client.post = vi.fn().mockResolvedValue(mockResponse);
        
        const data = ['value1', null, 'value2'];
        
        const result = await client.post('/test', data, 1000);
        
        expect(privateClient.client.post).toHaveBeenCalledWith(
            '/test',
            ['value1', 'value2'],
            { timeout: 1000 }
        );
        expect(result).toBe(mockResponse.data);
    });

    it('should handle PATCH requests and filter null values', async () => {
        const client = new BaseQuotientClient('test_api_key');
        const privateClient = client as any;
        
        const mockResponse = { data: { result: 'success' } };
        privateClient.client.patch = vi.fn().mockResolvedValue(mockResponse);
        
        const data = {
            valid: 'value',
            nullValue: null,
            nested: { valid: true }
        };
        
        const result = await client.patch('/test', data, 1000);
        
        expect(privateClient.client.patch).toHaveBeenCalledWith(
            '/test',
            { valid: 'value', nested: { valid: true } },
            { timeout: 1000 }
        );
        expect(result).toBe(mockResponse.data);
    });

    it('should handle DELETE requests', async () => {
        const client = new BaseQuotientClient('test_api_key');
        const privateClient = client as any;
        
        const mockResponse = { data: { result: 'success' } };
        privateClient.client.delete = vi.fn().mockResolvedValue(mockResponse);
        
        const result = await client.delete('/test', 1000);
        
        expect(privateClient.client.delete).toHaveBeenCalledWith(
            '/test',
            { timeout: 1000 }
        );
        expect(result).toBe(mockResponse.data);
    });


}); 