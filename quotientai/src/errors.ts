export class QuotientAIError extends Error {
  public status?: number;
  public code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'QuotientAIError';
    this.status = status;
    this.code = code;
  }
} 