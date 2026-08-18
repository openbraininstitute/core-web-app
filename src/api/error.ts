export interface ApiErrorCause {
  code?: string;
  message?: string;
  status?: number;
  details?: any;
  /** FastAPI `HTTPException` reason, from a `{ detail }` body. */
  detail?: string;
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
}

/** The backend's "not a member of this project" signal, as opposed to a real failure. */
export function isNotAuthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.cause?.code === 'NOT_AUTHORIZED';
}

export default ApiError;
