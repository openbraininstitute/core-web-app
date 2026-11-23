import { match, P } from 'ts-pattern';

import { ApiError } from '@/api/error';

export function reasonOf(error: unknown): string {
  return match(error)
    .with(P.instanceOf(ApiError), (failure) => {
      const said = failure.cause?.detail ?? failure.cause?.message;
      if (said) return said;
      return match(failure.cause?.status)
        .with(401, () => 'Your session has ended. Sign in again and retry.')
        .with(403, () => "You don't have permission to do this in this log.")
        .with(404, () => 'This log or file no longer exists.')
        .with(413, () => 'The file is too large for the server.')
        .with(429, () => 'Too many requests at once. Wait a moment and retry.')
        .with(P.number.gte(500), () => 'The server had a problem. Retry in a moment.')
        .with(P.number, (status) => `The request failed (HTTP ${status}).`)
        .otherwise(() => 'The request failed.');
    })
    .with(P.instanceOf(TypeError), () => "The server can't be reached. Check your connection.")
    .with(P.instanceOf(Error), (failure) => failure.message)
    .otherwise(() => 'Something went wrong.');
}
