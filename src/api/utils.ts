import { captureException } from '@sentry/nextjs';
import get from 'es-toolkit/compat/get';

import ApiError from '@/api/error';

type Ok<T> = {
  data: T;
  error: null;
};

type Err<E> = {
  data: null;
  error: E;
};

type Result<T, E = Error> = Ok<T> | Err<E>;

type DebugArgs = {
  section?: string;
  feature?: string;
  extra?: Record<string, any>;
};

export async function tryCatch<T, E = Error>(
  promise: Promise<T> | (() => Promise<T>),
  onComplete?: Function,
  debugArgs?: DebugArgs
): Promise<Result<T, E>> {
  try {
    const data = await (typeof promise === 'function' ? promise() : promise);
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

function findMappedEntry<T>(arr: any[], fn: (item: any) => any) {
  for (const item of arr) {
    const result = fn(item);
    if (result) return result as T;
  }
  return undefined;
}

const API_ERROR_CODE_PATHS = ['error.code', 'error_code', 'code'];
const API_ERROR_MESSAGE_PATHS = ['error.message', 'error_message', 'message'];
const API_ERROR_DETAILS_PATHS = ['error.details', 'error_details', 'details', 'data'];

/*
 * Parse the error code from the API response.
 *
 * @param response The HTTP Response object to read from
 *
 * @returns The error code or null if not found
 */
export async function parseApiError(
  url: string,
  status: number,
  apiClientResponseData: any
): Promise<ApiError> {
  try {
    const responseData =
      apiClientResponseData instanceof Response
        ? await apiClientResponseData.json()
        : apiClientResponseData;

    const code = findMappedEntry<string>(API_ERROR_CODE_PATHS, (path) => get(responseData, path));
    const message = findMappedEntry<string>(API_ERROR_MESSAGE_PATHS, (path) =>
      get(responseData, path)
    );
    const details = findMappedEntry<string>(API_ERROR_DETAILS_PATHS, (path) =>
      get(responseData, path)
    );

    const errMessage = message || `Error while fetching ${url}`;
    return new ApiError(errMessage, { code, message, details, status });
  } catch {
    return new ApiError(`Error while fetching ${url}`, { status });
  }
}
