import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export function logError(error: Error, context?: string) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}] ` : '';
    const stack = error.stack || '';
    
    console.error(`[${timestamp}] ${contextStr}${error.name}: ${error.message}`);
    console.error(stack);
}

export class QuotientAIError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'QuotientAIError';
    }
}

export class ValidationError extends QuotientAIError {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class APIError extends QuotientAIError {
    request: AxiosRequestConfig;
    body: any;
    code?: string;
    param?: string;
    type?: string;

    constructor(message: string, request: AxiosRequestConfig, body?: any) {
        super(message);
        this.name = 'APIError';
        this.request = request;
        this.body = body;

        if (body && typeof body === 'object') {
            this.code = body.code;
            this.param = body.param;
            this.type = body.type;
        }
    }
}

export class APIResponseValidationError extends APIError {
    response: AxiosResponse;
    status: number;

    constructor(response: AxiosResponse, body: any, message?: string) {
        super(
            message || 'Data returned by API invalid for expected schema.',
            response.config,
            body
        );
        this.name = 'APIResponseValidationError';
        this.response = response;
        this.status = response.status;
    }
}

export class APIStatusError extends APIError {
    response: AxiosResponse;
    status: number;

    constructor(message: string, response: AxiosResponse, body?: any) {
        super(message, response.config, body);
        this.name = 'APIStatusError';
        this.response = response;
        this.status = response.status;
    }
}

export class APIConnectionError extends APIError {
    constructor(message: string = 'Connection error.', request: AxiosRequestConfig) {
        super(message, request);
        this.name = 'APIConnectionError';
    }
}

export class APITimeoutError extends APIConnectionError {
    constructor(request: InternalAxiosRequestConfig | undefined) {
        super('Request timed out.', request || { url: 'unknown' });
        this.name = 'APITimeoutError';
    }
}

export class BadRequestError extends APIStatusError {
    status = 400;
    constructor(message: string, response: AxiosResponse, body?: any) {
        super(message, response, body);
        this.name = 'BadRequestError';
    }
}

export class AuthenticationError extends APIStatusError {
    status = 401;
    constructor(message: string, response: AxiosResponse, body?: any) {
        super(message, response, body);
        this.name = 'AuthenticationError';
    }
}

export class PermissionDeniedError extends APIStatusError {
    status = 403;
    constructor(message: string, response: AxiosResponse, body?: any) {
        super(message, response, body);
        this.name = 'PermissionDeniedError';
    }
}

export class NotFoundError extends APIStatusError {
    status = 404;
    constructor(message: string, response: AxiosResponse, body?: any) {
        super(message, response, body);
        this.name = 'NotFoundError';
    }
}

export class ConflictError extends APIStatusError {
    status = 409;
    constructor(message: string, response: AxiosResponse, body?: any) {
        super(message, response, body);
        this.name = 'ConflictError';
    }
}

export class UnprocessableEntityError extends APIStatusError {
    status = 422;
    constructor(message: string, response: AxiosResponse, body?: any) {
        super(message, response, body);
        this.name = 'UnprocessableEntityError';
    }
}

export class RateLimitError extends APIStatusError {
    status = 429;
    constructor(message: string, response: AxiosResponse, body?: any) {
        super(message, response, body);
        this.name = 'RateLimitError';
    }
}

export class InternalServerError extends APIStatusError {
    status = 500;
    constructor(message: string, response: AxiosResponse, body?: any) {
        super(message, response, body);
        this.name = 'InternalServerError';
    }
}

export function parseUnprocessableEntityError(response: AxiosResponse): string {
    try {
        const body = response.data;
        if ('detail' in body) {
            const missingFields: string[] = [];
            for (const detail of body.detail) {
                if (detail.type === 'missing') {
                    missingFields.push(detail.loc[detail.loc.length - 1]);
                }
            }
            if (missingFields.length) {
                return `missing required fields: ${missingFields.join(', ')}`;
            }
        }
        const error = new APIResponseValidationError(response, body);
        logError(error, 'parseUnprocessableEntityError');
        return 'Invalid response format';
    } catch (error) {
        const apiError = new APIResponseValidationError(response, null);
        logError(apiError, 'parseUnprocessableEntityError');
        return 'Invalid response format';
    }
}

export function parseBadRequestError(response: AxiosResponse): string {
    try {
        const body = response.data;
        if ('detail' in body) {
            return body.detail;
        }
        const error = new APIResponseValidationError(response, body);
        logError(error, 'parseBadRequestError');
        return 'Invalid request format';
    } catch (error) {
        const apiError = new APIResponseValidationError(response, null);
        logError(apiError, 'parseBadRequestError');
        return 'Invalid request format';
    }
}

export function handleErrors() {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function(...args: any[]) {
            let retries = 3;
            let delay = 1000;

            while (retries > 0) {
                try {
                    const response = await originalMethod.apply(this, args);
                    return response.data;
                } catch (err) {
                    if (axios.isAxiosError(err)) {
                        const axiosError = err as AxiosError;

                        if (axiosError.response) {
                            const { status, data } = axiosError.response;
                            
                            switch (status) {
                                case 400: {
                                    const message = parseBadRequestError(axiosError.response);
                                    const error = new BadRequestError(message, axiosError.response, data);
                                    logError(error, `${target.constructor.name}.${propertyKey}`);
                                    return null;
                                }
                                case 401: {
                                    const error = new AuthenticationError(
                                        'unauthorized: the request requires user authentication. ensure your API key is correct.',
                                        axiosError.response,
                                        data
                                    );
                                    logError(error, `${target.constructor.name}.${propertyKey}`);
                                    return null;
                                }
                                case 403: {
                                    const error = new PermissionDeniedError(
                                        'forbidden: the server understood the request, but it refuses to authorize it.',
                                        axiosError.response,
                                        data
                                    );
                                    logError(error, `${target.constructor.name}.${propertyKey}`);
                                    return null;
                                }
                                case 404: {
                                    const error = new NotFoundError(
                                        'not found: the server can not find the requested resource.',
                                        axiosError.response,
                                        data
                                    );
                                    logError(error, `${target.constructor.name}.${propertyKey}`);
                                    return null;
                                }
                                case 422: {
                                    const unprocessableMessage = parseUnprocessableEntityError(axiosError.response);
                                    const error = new UnprocessableEntityError(
                                        unprocessableMessage,
                                        axiosError.response,
                                        data
                                    );
                                    logError(error, `${target.constructor.name}.${propertyKey}`);
                                    return null;
                                }
                                default: {
                                    const error = new APIStatusError(
                                        `unexpected status code: ${status}. contact support@quotientai.co for help.`,
                                        axiosError.response,
                                        data
                                    );
                                    logError(error, `${target.constructor.name}.${propertyKey}`);
                                    return null;
                                }
                            }
                        }
                            
                        if (axiosError.code === 'ECONNABORTED') {
                            if (retries > 1) {
                                retries--;
                                await new Promise(resolve => setTimeout(resolve, delay));
                                delay *= 2; // Exponential backoff
                                continue;
                            }
                            const error = new APITimeoutError(axiosError.config);
                            logError(error, `${target.constructor.name}.${propertyKey}`);
                            return null;
                        }

                        const connectionError = new APIConnectionError(
                            'connection error. please try again later.',
                            axiosError.config || { url: 'unknown' }
                        );
                        logError(connectionError, `${target.constructor.name}.${propertyKey}`);
                        return null;
                    }
                    logError(err as Error, `${target.constructor.name}.${propertyKey}`);
                    return null;
                }
            }
        };

        return descriptor;
    };
}
