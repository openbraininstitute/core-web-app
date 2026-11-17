import { ApiError } from '@/api/error';

export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.cause?.status === 403;
}

// With no ApiError there was no readable response: a service error without CORS headers
// reaches the browser as a network failure, whatever really went wrong.
export function errorReason(error: unknown) {
  if (isForbidden(error)) return "Your account isn't allowed to do this.";
  return error instanceof ApiError ? error.message : 'The service gave no readable response.';
}
