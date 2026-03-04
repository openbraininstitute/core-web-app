export interface ApiErrorCause {
  code?: string;
  message?: string;
  status?: number;
  details?: any;
}

/*
 * ApiError is a custom error class that extends the built-in Error class.
 *
 * It is used to represent errors that occur when making API requests.
 */
export class ApiError extends Error {
  override cause?: ApiErrorCause;

  constructor(message: string, cause?: ApiErrorCause) {
    super(message);
    this.name = 'ApiError';
    this.cause = cause;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      cause: this.cause,
    };
  }
}

export type ValidationTarget = 'queryParams' | 'body' | 'response';

export class ValidationError extends ApiError {
  public readonly issues: Array<{
    path: (string | number)[];
    message: string;
    [key: string]: any;
  }>;

  constructor(target: ValidationTarget, zodError: { issues: ValidationError['issues'] }) {
    const summary = zodError.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    super(`Validation failed for ${target}`);
    this.name = 'ValidationError';
    this.issues = zodError.issues;
    this.cause = {
      message: summary,
      details: this.issues,
    };
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      issues: this.issues,
    };
  }
}

export default ApiError;
