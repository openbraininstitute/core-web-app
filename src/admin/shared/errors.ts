import { ApiError } from '@/api/error';

// The API's gate sends NOT_ALLOWED_OP too, always with this message.
const GATE_DENIAL = 'Not authorized to perform this action';

export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.cause?.status === 403;
}

// With no ApiError there was no readable response: a service error without CORS headers
// reaches the browser as a network failure, whatever really went wrong.
export function errorReason(error: unknown) {
  if (!(error instanceof ApiError)) return 'The service gave no readable response.';
  // A 403 for a business rule carries the API's reason. Only a gate's 403 means missing access.
  const businessRule = error.cause?.code === 'NOT_ALLOWED_OP' && error.message !== GATE_DENIAL;
  if (isForbidden(error) && !businessRule) return "Your account isn't allowed to do this.";
  return error.message;
}
