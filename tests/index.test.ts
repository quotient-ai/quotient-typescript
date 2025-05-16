import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuotientAI } from '../quotientai/index';
import { BaseQuotientClient } from '../quotientai/client';

vi.mock('../quotientai/client', () => {
  return {
    BaseQuotientClient: vi.fn().mockImplementation((apiKey) => {
      return {
        apiKey,
        client: {
          defaults: {
            headers: {
              common: {},
            },
          },
        },
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
      };
    }),
  };
});

// Mock AuthResource at the module level
const mockAuthenticate = vi.fn().mockResolvedValue({});
vi.mock('../quotientai/resources/auth', () => {
  return {
    AuthResource: vi.fn().mockImplementation(() => ({
      authenticate: mockAuthenticate,
      client: new BaseQuotientClient('test_api_key'),
    })),
  };
});

describe('QuotientAI', () => {
  beforeEach(() => {
    // Reset environment variable and mocks before each test
    process.env.QUOTIENT_API_KEY = undefined;
    vi.clearAllMocks();
  });

  it('should initialize with the correct api key', () => {
    new QuotientAI('test_api_key');
    expect(BaseQuotientClient).toHaveBeenCalledWith('test_api_key');
  });

  it('should initialize with the correct api key from environment variable', () => {
    process.env.QUOTIENT_API_KEY = 'test_api_key';
    new QuotientAI();
    expect(BaseQuotientClient).toHaveBeenCalledWith('test_api_key');
  });

  it('should log an error if no api key is provided', () => {
    process.env.QUOTIENT_API_KEY = '';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    new QuotientAI();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Could not find API key. Either pass apiKey to QuotientAI() or set the QUOTIENT_API_KEY environment variable. If you do not have an API key, you can create one at https://app.quotientai.co in your settings page'
      )
    );
  });

  it('should call the auth resource on initialization', async () => {
    new QuotientAI('test_api_key');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockAuthenticate).toHaveBeenCalledOnce();
  });
});
