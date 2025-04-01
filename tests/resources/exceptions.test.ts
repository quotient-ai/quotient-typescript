import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuotientAIError, 
    APIError, 
    APIResponseValidationError, 
    APIStatusError, 
    APIConnectionError, 
    APITimeoutError, 
    BadRequestError, 
    AuthenticationError, 
    PermissionDeniedError, 
    NotFoundError, 
    ConflictError, 
    UnprocessableEntityError, 
    RateLimitError, 
    InternalServerError,
    parseUnprocessableEntityError,
    parseBadRequestError,
    handleErrors,
    logError } from '../../quotientai/exceptions';
import axios from 'axios';

describe('QuotientAIError', () => {
    it('should create an error with the correct message', () => {
        const error = new QuotientAIError('Test error');
        expect(error.message).toBe('Test error');
        expect(error.name).toBe('QuotientAIError');
    });
});

describe('APIError', () => {
    it('should create an API error with request and body', () => {
        const request = { url: 'test', headers: {} } as any;
        const body = { code: 'test_code', param: 'test_param', type: 'test_type' };
        const error = new APIError('Test error', request, body);
        expect(error.message).toBe('Test error');
        expect(error.name).toBe('APIError');
        expect(error.request).toBe(request);
        expect(error.body).toBe(body);
        expect(error.code).toBe('test_code');
        expect(error.param).toBe('test_param');
        expect(error.type).toBe('test_type');
    });
});

describe('APIResponseValidationError', () => {
    it('should create a validation error with response and status', () => {
        const response = { status: 400, config: { url: 'test', headers: {} } } as any;
        const error = new APIResponseValidationError(response, {});
        expect(error.message).toBe('Data returned by API invalid for expected schema.');
        expect(error.name).toBe('APIResponseValidationError');
        expect(error.response).toBe(response);
        expect(error.status).toBe(400);
    });
});

describe('APIStatusError', () => {
    it('should create a status error with response and status', () => {
        const response = { status: 500, config: { url: 'test', headers: {} } } as any;
        const error = new APIStatusError('Test error', response);
        expect(error.message).toBe('Test error');
        expect(error.name).toBe('APIStatusError');
        expect(error.response).toBe(response);
        expect(error.status).toBe(500);
    });
});

describe('APIConnectionError', () => {
    it('should create a connection error', () => {
        const request = { url: 'test', headers: {} } as any;
        const error = new APIConnectionError('Test error', request);
        expect(error.message).toBe('Test error');
        expect(error.name).toBe('APIConnectionError');
        expect(error.request).toBe(request);
    });
});

describe('APITimeoutError', () => {
    it('should create a timeout error', () => {
        const request = { url: 'test', headers: {} } as any;
        const error = new APITimeoutError(request);
        expect(error.message).toBe('Request timed out.');
        expect(error.name).toBe('APITimeoutError');
        expect(error.request).toBe(request);
    });

    it('should create a timeout error with unknown url when request is undefined', () => {
        const error = new APITimeoutError(undefined);
        expect(error.message).toBe('Request timed out.');
        expect(error.name).toBe('APITimeoutError');
        expect(error.request).toEqual({ url: 'unknown' });
    });
});

describe('HTTP Status Errors', () => {
    it('should create BadRequestError', () => {
        const response = { status: 400, config: { url: 'test', headers: {} } } as any;
        const error = new BadRequestError('Test error', response);
        expect(error.status).toBe(400);
    });

    it('should create AuthenticationError', () => {
        const response = { status: 401, config: { url: 'test', headers: {} } } as any;
        const error = new AuthenticationError('Test error', response);
        expect(error.status).toBe(401);
    });

    it('should create PermissionDeniedError', () => {
        const response = { status: 403, config: { url: 'test', headers: {} } } as any;
        const error = new PermissionDeniedError('Test error', response);
        expect(error.status).toBe(403);
    });

    it('should create NotFoundError', () => {
        const response = { status: 404, config: { url: 'test', headers: {} } } as any;
        const error = new NotFoundError('Test error', response);
        expect(error.status).toBe(404);
    });

    it('should create ConflictError', () => {
        const response = { status: 409, config: { url: 'test', headers: {} } } as any;
        const error = new ConflictError('Test error', response);
        expect(error.status).toBe(409);
    });

    it('should create UnprocessableEntityError', () => {
        const response = { status: 422, config: { url: 'test', headers: {} } } as any;
        const error = new UnprocessableEntityError('Test error', response);
        expect(error.status).toBe(422);
    });

    it('should create RateLimitError', () => {
        const response = { status: 429, config: { url: 'test', headers: {} } } as any;
        const error = new RateLimitError('Test error', response);
        expect(error.status).toBe(429);
    });

    it('should create InternalServerError', () => {
        const response = { status: 500, config: { url: 'test', headers: {} } } as any;
        const error = new InternalServerError('Test error', response);
        expect(error.status).toBe(500);
    });
});

describe('Error Parsing Functions', () => {
    describe('parseUnprocessableEntityError', () => {
        it('should parse missing fields error', () => {
            const response = {
                data: {
                    detail: [
                        { type: 'missing', loc: ['body', 'name'] },
                        { type: 'missing', loc: ['body', 'email'] }
                    ]
                }
            } as any;
            const message = parseUnprocessableEntityError(response);
            expect(message).toBe('missing required fields: name, email');
        });

        it('should handle invalid detail format', () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const response = {
                data: {
                    detail: 'Invalid format'
                }
            } as any;
            const message = parseUnprocessableEntityError(response);
            expect(message).toBe('Invalid response format');
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('APIResponseValidationError'));
        });

        it('should handle invalid body', () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const response = {
                data: null
            } as any;
            const message = parseUnprocessableEntityError(response);
            expect(message).toBe('Invalid response format');
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('APIResponseValidationError'));
        });
    });

    describe('parseBadRequestError', () => {
        it('should parse detail message from response', () => {
            const response = {
                data: {
                    detail: 'Invalid input data'
                }
            } as any;
            const message = parseBadRequestError(response);
            expect(message).toBe('Invalid input data');
        });

        it('should handle missing detail', () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const response = {
                data: {
                    message: 'Invalid format'
                }
            } as any;
            const message = parseBadRequestError(response);
            expect(message).toBe('Invalid request format');
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('APIResponseValidationError'));
        });

        it('should handle invalid body', () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const response = {
                data: null
            } as any;
            const message = parseBadRequestError(response);
            expect(message).toBe('Invalid request format');
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('APIResponseValidationError'));
        });
    });
});

describe('Error Handling', () => {
    it('should handle successful responses', async () => {
        const response = { data: { success: true } };
        const handler = handleErrors();
        const descriptor = handler({}, 'testMethod', { value: async () => response });
        const result = await descriptor.value();
        expect(result).toEqual({ success: true });
    });

    it('should handle BadRequestError (400)', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const axiosError = {
            isAxiosError: true,
            response: {
                status: 400,
                data: { detail: 'Invalid request' },
                config: { url: 'test', headers: {} }
            }
        } as any;
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        
        const handler = handleErrors();
        const descriptor = handler({}, 'testMethod', { 
            value: async () => { throw axiosError; } 
        });

        const result = await descriptor.value();
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('BadRequestError'));
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid request'));
    });

    it('should handle AuthenticationError (401)', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const axiosError = {
            isAxiosError: true,
            response: {
                status: 401,
                data: { detail: 'Unauthorized' },
                config: { url: 'test', headers: {} }
            }
        } as any;
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        
        const handler = handleErrors();
        const descriptor = handler({}, 'testMethod', { 
            value: async () => { throw axiosError; } 
        });

        const result = await descriptor.value();
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('AuthenticationError'));
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('unauthorized'));
    });

    it('should handle PermissionDeniedError (403)', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const axiosError = {
            isAxiosError: true,
            response: {
                status: 403,
                data: { detail: 'Forbidden' },
                config: { url: 'test', headers: {} }
            }
        } as any;
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        
        const handler = handleErrors();
        const descriptor = handler({}, 'testMethod', { 
            value: async () => { throw axiosError; } 
        });

        const result = await descriptor.value();
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('PermissionDeniedError'));
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('forbidden'));
    });

    it('should handle NotFoundError (404)', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const axiosError = {
            isAxiosError: true,
            response: {
                status: 404,
                data: { detail: 'Not found' },
                config: { url: 'test', headers: {} }
            }
        } as any;
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        
        const handler = handleErrors();
        const descriptor = handler({}, 'testMethod', { 
            value: async () => { throw axiosError; } 
        });

        const result = await descriptor.value();
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('NotFoundError'));
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });

    it('should handle UnprocessableEntityError (422)', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const axiosError = {
            isAxiosError: true,
            response: {
                status: 422,
                data: {
                    detail: [
                        { type: 'missing', loc: ['body', 'name'] }
                    ]
                },
                config: { url: 'test', headers: {} }
            }
        } as any;
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        
        const handler = handleErrors();
        const descriptor = handler({}, 'testMethod', { 
            value: async () => { throw axiosError; } 
        });

        const result = await descriptor.value();
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('UnprocessableEntityError'));
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('missing required fields'));
    });

    it('should handle APITimeoutError with retries', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const axiosError = {
            isAxiosError: true,
            code: 'ECONNABORTED',
            config: { url: 'test', headers: {} }
        } as any;
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        
        let attempts = 0;
        const handler = handleErrors();
        const descriptor = handler({}, 'testMethod', { 
            value: async () => {
                attempts++;
                throw axiosError;
            } 
        });

        const result = await descriptor.value();
        expect(result).toBeNull();
        expect(attempts).toBe(3); // Should have tried 3 times
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('APITimeoutError'));
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Request timed out'));
    });

    it('should handle APIConnectionError', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const axiosError = {
            isAxiosError: true,
            response: null,
            code: 'NETWORK_ERROR',
            config: { url: 'test', headers: {} }
        } as any;
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        
        const handler = handleErrors();
        const descriptor = handler({}, 'testMethod', { 
            value: async () => { throw axiosError; } 
        });

        const result = await descriptor.value();
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('APIConnectionError'));
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('connection error'));
    });

    it('should handle Axios error with response but no status code', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const axiosError = {
            isAxiosError: true,
            response: {
                data: { detail: 'Invalid response' },
                config: { url: 'test', headers: {} }
            }
        } as any;
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        
        const handler = handleErrors();
        const descriptor = handler({}, 'testMethod', { 
            value: async () => { throw axiosError; } 
        });

        const result = await descriptor.value();
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('APIStatusError'));
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('unexpected status code: undefined'));
    });

    it('should handle Axios error with undefined response', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const axiosError = {
            isAxiosError: true,
            response: undefined,
            config: { url: 'test', headers: {} }
        } as any;
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        
        const handler = handleErrors();
        const descriptor = handler({}, 'testMethod', { 
            value: async () => { throw axiosError; } 
        });

        const result = await descriptor.value();
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('APIConnectionError'));
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('connection error'));
    });

    it('should handle Axios error with undefined config', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const axiosError = {
            isAxiosError: true,
            response: undefined,
            config: undefined
        } as any;
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        
        const handler = handleErrors();
        const descriptor = handler({}, 'testMethod', { 
            value: async () => { throw axiosError; } 
        });

        const result = await descriptor.value();
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('APIConnectionError'));
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('connection error'));
    });

    it('should handle Axios error without response property', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const axiosError = {
            isAxiosError: true,
            code: 'NETWORK_ERROR',
            config: { url: 'test', headers: {} }
        } as any;
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        
        const handler = handleErrors();
        const descriptor = handler({}, 'testMethod', { 
            value: async () => { throw axiosError; } 
        });

        const result = await descriptor.value();
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('APIConnectionError'));
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('connection error'));
    });

    it('should handle Axios error with false response', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const axiosError = {
            isAxiosError: true,
            response: false,
            code: 'NETWORK_ERROR',
            config: { url: 'test', headers: {} }
        } as any;
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        
        const handler = handleErrors();
        const descriptor = handler({}, 'testMethod', { 
            value: async () => { throw axiosError; } 
        });

        const result = await descriptor.value();
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('APIConnectionError'));
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('connection error'));
    });

    it('should handle non-axios errors', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const handler = handleErrors();
        const descriptor = handler({}, 'testMethod', { 
            value: async () => { throw new Error('Test error'); } 
        });
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(false);

        await descriptor.value()
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Test error'));
    });

    it('should handle unexpected status codes', async () => {
        // spy on console.error
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const axiosError = {
            isAxiosError: true,
            response: {
                status: 418,
                data: { detail: 'I am a teapot' },
                config: { url: 'test', headers: {} }
            }
        } as any;
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        
        const handler = handleErrors();
        const descriptor = handler({}, 'testMethod', { 
            value: async () => { throw axiosError; } 
        });

        await descriptor.value();

        // expect console.error to have been called
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('APIStatusError'));
        // expect console.error to have been called with the message
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('unexpected status code: 418'));
    });
});

describe('logError', () => {
    let consoleErrorSpy: any;
    const mockDate = new Date('2024-01-01T12:00:00.000Z');

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.setSystemTime(mockDate);
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        vi.useRealTimers();
    });

    it('should log error with timestamp and stack trace when no context provided', () => {
        const error = new Error('Test error');
        error.stack = 'Error: Test error\n    at Test.stack';
        
        logError(error);

        expect(consoleErrorSpy).toHaveBeenCalledWith('[2024-01-01T12:00:00.000Z] Error: Test error');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Test error\n    at Test.stack');
    });

    it('should log error with timestamp, context, and stack trace when context provided', () => {
        const error = new Error('Test error');
        error.stack = 'Error: Test error\n    at Test.stack';
        const context = 'TestContext';
        
        logError(error, context);

        expect(consoleErrorSpy).toHaveBeenCalledWith('[2024-01-01T12:00:00.000Z] [TestContext] Error: Test error');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Test error\n    at Test.stack');
    });

    it('should handle error without stack trace', () => {
        const error = new Error('Test error');
        error.stack = '';
        
        logError(error);

        expect(consoleErrorSpy).toHaveBeenCalledWith('[2024-01-01T12:00:00.000Z] Error: Test error');
        expect(consoleErrorSpy).toHaveBeenCalledWith('');
    });

    it('should handle custom error types', () => {
        const error = new QuotientAIError('Custom error');
        error.stack = 'QuotientAIError: Custom error\n    at Test.stack';
        
        logError(error);

        expect(consoleErrorSpy).toHaveBeenCalledWith('[2024-01-01T12:00:00.000Z] QuotientAIError: Custom error');
        expect(consoleErrorSpy).toHaveBeenCalledWith('QuotientAIError: Custom error\n    at Test.stack');
    });
});


