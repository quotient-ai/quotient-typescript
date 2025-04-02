import axios, { AxiosInstance } from 'axios';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TokenData } from './types';
import { logError, QuotientAIError } from './exceptions';

export class BaseQuotientClient {
  private apiKey: string;
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private tokenPath: string;
  public client: AxiosInstance;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    
    // Determine token directory
    let tokenDir: string;
    try {
      tokenDir = os.homedir();
    } catch {
      if (fs.existsSync('/root/')) {
        tokenDir = '/root';
      } else {
        tokenDir = process.cwd();
      }
    }

    this.tokenPath = path.join(tokenDir, '.quotient', 'auth_token.json');

    // Initialize axios instance
    this.client = axios.create({
      baseURL: 'https://api.quotientai.co/api/v1',
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    // Load existing token
    this.loadToken();

    // Set up response interceptor for token handling
    this.client.interceptors.response.use(
      (response) => this.handleResponse(response),
      (error) => Promise.reject(error)
    );
  }

  private loadToken(): void {
    if (!fs.existsSync(this.tokenPath)) {
      return;
    }

    try {
      const data = JSON.parse(fs.readFileSync(this.tokenPath, 'utf-8')) as TokenData;
      this.token = data.token;
      this.tokenExpiry = data.expires_at;
    } catch {
      // If loading fails, token remains null
    }
  }

  private saveToken(token: string, expiry: number): void {
    this.token = token;
    this.tokenExpiry = expiry;

    try {
      // Create directory if it doesn't exist
      fs.mkdirSync(path.dirname(this.tokenPath), { recursive: true });

      // Save to disk
      fs.writeFileSync(
        this.tokenPath,
        JSON.stringify({ token, expires_at: expiry })
      );
    } catch (error) {
      logError(new QuotientAIError('Could not create directory for token. If you see this error please notify us at contact@quotientai.co'));
    }
  }

  private isTokenValid(): boolean {
    if (!this.token) {
      return false;
    }

    // With 5-minute buffer
    return Date.now() / 1000 < (this.tokenExpiry - 300);
  }

  private updateAuthHeader(): void {
    if (this.isTokenValid()) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    } else {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.apiKey}`;
    }
  }

  private handleResponse(response: any): any {
    const jwtToken = response.headers['x-jwt-token'];
    if (jwtToken) {
      try {
        // Parse token to get expiry
        const decoded = jwt.decode(jwtToken) as { exp?: number };
        const expiry = decoded.exp || Math.floor(Date.now() / 1000) + 3600; // Default 1h if no exp

        this.saveToken(jwtToken, expiry);
        this.updateAuthHeader();
      } catch (error) {
        // If token parsing fails, continue with current auth
      }
    }

    return response;
  }

  // GET requests returns json
  public async get<T>(path: string, params?: Record<string, any>, timeout?: number): Promise<T> {
    this.updateAuthHeader();
    const response = await this.client.get(path, { params, timeout });
    return response.data;
  }

  public async post<T>(path: string, data: any = {}, timeout?: number): Promise<T> {
    this.updateAuthHeader();

    // Filter out null values
    const filteredData = Array.isArray(data)
      ? data.filter(v => v !== null)
      : Object.fromEntries(
          Object.entries(data).filter(([_, v]) => v !== null)
        );

    const response = await this.client.post(path, filteredData, { timeout });
    return response.data;
  }

  public async patch<T>(path: string, data: any = {}, timeout?: number): Promise<T> {
    this.updateAuthHeader();

    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== null)
    );

    const response = await this.client.patch(path, filteredData, { timeout });
    return response.data;
  }

  public async delete<T>(path: string, timeout?: number): Promise<T> {
    this.updateAuthHeader();
    const response = await this.client.delete(path, { timeout });
    return response.data;
  }
} 