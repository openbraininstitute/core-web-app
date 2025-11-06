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
export default class ApiError extends Error {
  override cause?: ApiErrorCause;

  constructor(message: string, cause?: ApiErrorCause) {
    super(message);
    this.name = 'ApiError';
    this.cause = cause;
  }
}
