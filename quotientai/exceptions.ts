import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const DEFAULT_REQUEST_TIMEOUT = 10000; // 10 seconds in milliseconds

export class QuotientAIError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'QuotientAIError';
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
}

export class AuthenticationError extends APIStatusError {
    status = 401;
}

export class PermissionDeniedError extends APIStatusError {
    status = 403;
}

export class NotFoundError extends APIStatusError {
    status = 404;
}

export class ConflictError extends APIStatusError {
    status = 409;
}

export class UnprocessableEntityError extends APIStatusError {
    status = 422;
}

export class RateLimitError extends APIStatusError {
    status = 429;
}

export class InternalServerError extends APIStatusError {
    status = 500;
}

function parseUnprocessableEntityError(response: AxiosResponse): string {
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
        throw new APIResponseValidationError(response, body);
    } catch (error) {
        throw new APIResponseValidationError(response, null);
    }
}

function parseBadRequestError(response: AxiosResponse): string {
    try {
        const body = response.data;
        if ('detail' in body) {
            return body.detail;
        }
        throw new APIResponseValidationError(response, body);
    } catch (error) {
        throw new APIResponseValidationError(response, null);
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
                } catch (error) {
                    if (axios.isAxiosError(error)) {
                        const axiosError = error as AxiosError;

                        if (axiosError.response) {
                            const { status, data } = axiosError.response;
                            
                            switch (status) {
                                case 400:
                                    const message = parseBadRequestError(axiosError.response);
                                    throw new BadRequestError(message, axiosError.response, data);
                                case 401:
                                    throw new AuthenticationError(
                                        'unauthorized: the request requires user authentication. ensure your API key is correct.',
                                        axiosError.response,
                                        data
                                    );
                                case 403:
                                    throw new PermissionDeniedError(
                                        'forbidden: the server understood the request, but it refuses to authorize it.',
                                        axiosError.response,
                                        data
                                    );
                                case 404:
                                    throw new NotFoundError(
                                        'not found: the server can not find the requested resource.',
                                        axiosError.response,
                                        data
                                    );
                                case 422:
                                    const unprocessableMessage = parseUnprocessableEntityError(axiosError.response);
                                    throw new UnprocessableEntityError(
                                        unprocessableMessage,
                                        axiosError.response,
                                        data
                                    );
                                default:
                                    throw new APIStatusError(
                                        `unexpected status code: ${status}. contact support@quotientai.co for help.`,
                                        axiosError.response,
                                        data
                                    );
                            }
                        }

                        if (axiosError.code === 'ECONNABORTED') {
                            if (retries > 1) {
                                retries--;
                                await new Promise(resolve => setTimeout(resolve, delay));
                                delay *= 2; // Exponential backoff
                                continue;
                            }
                            throw new APITimeoutError(axiosError.config);
                        }

                        throw new APIConnectionError(
                            'connection error. please try again later.',
                            axiosError.config || { url: 'unknown' }
                        );
                    }
                    throw error;
                }
            }
        };

        return descriptor;
    };
}

// Async version of the decorator
export function handleAsyncErrors() {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function(...args: any[]) {
            let retries = 3;
            let delay = 1000;

            while (retries > 0) {
                try {
                    const response = await originalMethod.apply(this, args);
                    return response.data;
                } catch (error) {
                    if (axios.isAxiosError(error)) {
                        const axiosError = error as AxiosError;

                        if (axiosError.response) {
                            const { status, data } = axiosError.response;
                            
                            switch (status) {
                                case 400:
                                    const message = parseBadRequestError(axiosError.response);
                                    throw new BadRequestError(message, axiosError.response, data);
                                case 401:
                                    throw new AuthenticationError(
                                        'unauthorized: the request requires user authentication. ensure your API key is correct.',
                                        axiosError.response,
                                        data
                                    );
                                case 403:
                                    throw new PermissionDeniedError(
                                        'forbidden: the server understood the request, but it refuses to authorize it.',
                                        axiosError.response,
                                        data
                                    );
                                case 404:
                                    throw new NotFoundError(
                                        'not found: the server can not find the requested resource.',
                                        axiosError.response,
                                        data
                                    );
                                case 422:
                                    const unprocessableMessage = parseUnprocessableEntityError(axiosError.response);
                                    throw new UnprocessableEntityError(
                                        unprocessableMessage,
                                        axiosError.response,
                                        data
                                    );
                                default:
                                    throw new APIStatusError(
                                        `unexpected status code: ${status}. contact support@quotientai.co for help.`,
                                        axiosError.response,
                                        data
                                    );
                            }
                        }

                        if (axiosError.code === 'ECONNABORTED') {
                            if (retries > 1) {
                                retries--;
                                await new Promise(resolve => setTimeout(resolve, delay));
                                delay *= 2; // Exponential backoff
                                continue;
                            }
                            throw new APITimeoutError(axiosError.config);
                        }

                        throw new APIConnectionError(
                            'connection error. please try again later.',
                            axiosError.config || { url: 'unknown' }
                        );
                    }
                    throw error;
                }
            }
        };

        return descriptor;
    };
} 