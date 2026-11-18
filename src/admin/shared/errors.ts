import { ApiError } from '@/api/error';

export function isForbidden(error: unknown): error is ApiError {
  return error instanceof ApiError && error.cause?.status === 403;
}

// With no ApiError there was no readable response: a service error without CORS headers
// reaches the browser as a network failure, whatever really went wrong.
export function errorReason(error: unknown) {
  // A 403 for a business rule carries the API's reason. Only a gate's 403 means missing access.
  if (isForbidden(error) && error.cause?.code !== 'NOT_ALLOWED_OP') {
    return "Your account isn't allowed to do this.";
  }
  return error instanceof ApiError ? error.message : 'The service gave no readable response.';
}
