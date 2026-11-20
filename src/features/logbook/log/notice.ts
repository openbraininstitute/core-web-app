import { match, P } from 'ts-pattern';

import { ApiError } from '@/api/error';

import type { TValueOf } from '@/api/logbook/types';

export const NoticeKind = {
  Success: 'success',
  Info: 'info',
  Warning: 'warning',
  Error: 'error',
} as const;
export type TNoticeKind = TValueOf<typeof NoticeKind>;

export interface INotice {
  readonly kind: TNoticeKind;
  readonly title: string;
  readonly description?: string;
}

/** A failure in words people can act on: the server's own reason first, else one from the status. */
export function reasonOf(error: unknown): string {
  if (error instanceof ApiError) {
    const said = error.cause?.detail ?? error.cause?.message;
    if (said) return said;
    return match(error.cause?.status)
      .with(401, () => 'Your session has ended. Sign in again and retry.')
      .with(403, () => "You don't have permission to do this in this log.")
      .with(404, () => 'This log or file no longer exists.')
      .with(413, () => 'The file is too large for the server.')
      .with(429, () => 'Too many requests at once. Wait a moment and retry.')
      .with(P.number.gte(500), () => 'The server had a problem. Retry in a moment.')
      .with(P.number, (status) => `The request failed (HTTP ${status}).`)
      .otherwise(() => 'The request failed.');
  }
  if (error instanceof TypeError) return "The server can't be reached. Check your connection.";
  return error instanceof Error ? error.message : 'Something went wrong.';
}
