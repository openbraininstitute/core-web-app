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

const API_ERROR_CODE_PATHS = ['error.code', 'error_code', 'code', 'detail.code'];
const API_ERROR_MESSAGE_PATHS = ['error.message', 'error_message', 'message', 'detail.detail'];
const API_ERROR_DETAILS_PATHS = ['error.details', 'error_details', 'details', 'data', 'detail'];

export async function parseApiError(
  url: string,
  status: number,
  apiClientResponseData: any
): Promise<ApiError> {
  const errMessage = `Error while fetching ${url}`;

  try {
    let responseData: any = null;

    if (apiClientResponseData instanceof Response) {
      const rawText = await apiClientResponseData.clone().text().catch(() => '');
      try {
        responseData = JSON.parse(rawText);
      } catch {
        responseData = { message: rawText || apiClientResponseData.statusText };
      }
    } else if (typeof apiClientResponseData === 'string') {
      try {
        responseData = JSON.parse(apiClientResponseData);
      } catch {
        responseData = { message: apiClientResponseData };
      }
    } else {
      responseData = apiClientResponseData;
    }

    const code = findMappedEntry<string>(API_ERROR_CODE_PATHS, (path) => get(responseData, path));
    const message = findMappedEntry<string>(API_ERROR_MESSAGE_PATHS, (path) => get(responseData, path));
    
    let details = findMappedEntry<any>(API_ERROR_DETAILS_PATHS, (path) => get(responseData, path));
    if (!details) {
      details = responseData; 
    }

    return new ApiError(errMessage, { 
      code, 
      message, 
      details, 
      status,
      originalError: apiClientResponseData 
    });
  } catch {
    return new ApiError(errMessage, { status, originalError: apiClientResponseData });
  }
}