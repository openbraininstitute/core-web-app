import { captureException } from '@sentry/nextjs';
import get from 'lodash/get';

type Ok<T> = {
  data: T;
  error: null;
};

type Err<E> = {
  data: null;
  error: E;
};

export type Result<T, E = Error> = Ok<T> | Err<E>;

type DebugArgs = {
  section?: string;
  feature?: string;
  extra?: Record<string, any>;
};

export async function tryCatch<T, E = Error>(
  promise: Promise<T>,
  onComplete?: Function,
  debugArgs?: DebugArgs
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    captureException(error, {
      tags: { section: debugArgs?.section, feature: debugArgs?.feature },
      extra: {
        ...(debugArgs?.extra ?? {}),
        cause: get(error, 'cause', {}),
      },
    });
    return { data: null, error: error as E };
  } finally {
    onComplete?.();
  }
}
