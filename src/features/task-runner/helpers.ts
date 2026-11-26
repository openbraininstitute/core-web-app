import { ApiError } from '@/api/error';
import { errorRegistry } from '@/features/scan-config/error-registry';
import { getErrorMessage } from '@/utils/error';

/** The message to show for a failed task launch: the API's own message when it has one. */
export function launchErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  const code = error.cause?.code;
  const apiMessage = error.cause?.message ?? fallback;
  return code ? getErrorMessage(code, errorRegistry, apiMessage) : apiMessage;
}
