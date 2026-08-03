export interface ErrorDetail {
  path?: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors: ErrorDetail[];
  public readonly operational: boolean;

  constructor(message: string, statusCode = 500, errors: ErrorDetail[] = [], operational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.operational = operational;
    Error.captureStackTrace(this, this.constructor);
  }
}
