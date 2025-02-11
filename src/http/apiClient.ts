import { getSession } from 'next-auth/react';
import omitBy from 'lodash/omitBy';
import isNil from 'lodash/isNil';

type BackoffStrategy = {
  type: 'exponential' | 'custom';
  delay: number;
  fn?: (attempt: number) => number;
};

type RequestConfiguration = {
  timeout?: number;
  attempts?: number;
  backoff?: BackoffStrategy;
  retryOnError?: boolean;
  retryOnException?: boolean;
};

type RequestOptions = {
  headers?: Record<string, string>;
  queryParams?: Record<
    string,
    string | number | string[] | number[] | null | undefined | boolean | Date
  >;
  body?: any;
  signal?: AbortSignal;
};

type ApiClientOptions = {
  rootUri: string;
  token?: string;
  headers?: Record<string, string>;
  config?: RequestConfiguration;
};

class ApiClient {
  private _rootUrl: string;

  private _headers: Record<string, string>;

  private _token?: string;

  private _timeout?: number;

  private _attempts?: number;

  private _backoff?: BackoffStrategy;

  private _retryOnError?: boolean;

  private _retryOnException?: boolean;

  private requestInterceptors: ((request: Request) => Promise<Request>)[] = [];

  private responseInterceptors: ((response: Response) => Promise<Response>)[] = [];

  constructor({ rootUri: rootUrl, token, headers = {}, config = {} }: ApiClientOptions) {
    this._rootUrl = rootUrl;
    this._headers = headers ?? {
      'Content-Type': 'application/json',
      'Accept-Type': 'application/json',
    };
    this._token = token;
    this._timeout = config.timeout;
    this._attempts = config.attempts;
    this._backoff = config.backoff;
    this._retryOnError = config.retryOnError;
    this._retryOnException = config.retryOnException;
  }

  /**
   * Makes an HTTP request.
   *
   * @template T
   * @param {string} method - The HTTP method (GET, POST, etc.)
   * @param {string} endpoint - The endpoint to send the request to
   * @param {RequestOptions} [options] - The options for the request
   * @param {RequestConfiguration} [config] - The configuration for the request
   * @param {() => void} [onAbort] - Callback function to execute if the request is aborted
   * @returns {Promise<T>} A promise that resolves to the response data
   */
  private async _request<T>(
    method: string,
    endpoint: string,
    options: RequestOptions = {},
    config: RequestConfiguration = {},
    onAbort?: () => void
  ): Promise<T> {
    let attempt = 0;
    const maxAttempts = config.attempts ?? this._attempts ?? 1;

    const url = new URL(endpoint, this._rootUrl);
    Object.entries(omitBy(options.queryParams, isNil) || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(`${key}[]`, `${v}`));
      } else {
        url.searchParams.append(key, String(value));
      }
    });

    const runRequest = async (): Promise<T> => {
      attempt++;
      let request = new Request(url.toString(), {
        method,
        headers: {
          ...this._headers,
          ...(this._token ? { Authorization: `Bearer ${this._token}` } : {}),
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
      });

      for (const interceptor of this.requestInterceptors) {
        request = await interceptor(request);
      }

      let response = await fetch(request);
      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response);
      }

      if (!response.ok && (config.retryOnError ?? this._retryOnError) && attempt < maxAttempts) {
        const delay = this.calculateBackoff(attempt, config.backoff ?? this._backoff);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return runRequest();
      }

      const contentType = response.headers.get('Content-Type') || '';
      let responseData: T;
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else if (contentType.includes('text')) {
        responseData = (await response.text()) as unknown as T;
        // TODO: fix the return type for binary types
      } else if (contentType.includes('application/octet-stream')) {
        responseData = (await response.blob()) as unknown as T;
      } else {
        responseData = (await response.arrayBuffer()) as unknown as T;
      }

      if (!response.ok) {
        if ((config.retryOnError ?? this._retryOnError) && attempt < maxAttempts) {
          const delay = this.calculateBackoff(attempt, config.backoff ?? this._backoff);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return runRequest();
        }
        throw Error(`Request ${request.url} failed `, {
          cause: {
            status: response.status,
            message:
              (responseData as any).message || `Request failed with status ${response.status}`,
            data: responseData,
          },
        });
      }

      return responseData;
    };

    try {
      return await runRequest();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        onAbort?.();
        throw new Error(`Request was aborted`);
      }
      if ((config.retryOnException ?? this._retryOnException) && attempt < maxAttempts) {
        const delay = this.calculateBackoff(attempt, config.backoff ?? this._backoff);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this._request<T>(method, endpoint, options, { ...config, attempts: attempt + 1 });
      }
      throw error;
    }
  }

  /**
   * Calculates the backoff delay based on the attempt number and strategy.
   *
   * @param {number} attempt - The current attempt number
   * @param {BackoffStrategy} [backoff] - The backoff strategy
   * @returns {number} The calculated delay in milliseconds
   */
  private calculateBackoff(attempt: number, backoff?: BackoffStrategy): number {
    if (!backoff) return 0;
    if (backoff.type === 'custom' && backoff.fn) {
      return backoff.fn(attempt);
    }
    return backoff.type === 'exponential' ? backoff.delay * 2 ** (attempt - 1) : backoff.delay;
  }

  get<T>(endpoint: string, options?: RequestOptions, config?: RequestConfiguration) {
    return this._request<T>('get', endpoint, options, config);
  }

  post<T>(endpoint: string, options?: RequestOptions, config?: RequestConfiguration) {
    return this._request<T>('post', endpoint, options, config);
  }

  put<T>(endpoint: string, options?: RequestOptions, config?: RequestConfiguration) {
    return this._request<T>('put', endpoint, options, config);
  }

  delete<T>(endpoint: string, options?: RequestOptions, config?: RequestConfiguration) {
    return this._request<T>('delete', endpoint, options, config);
  }
}

/**
 * Creates an authenticated API client.
 *
 * @param {string} rootUri - The root URI for the API client
 * @returns {Promise<ApiClient>} A promise that resolves to an instance of ApiClient
 */
export default async function authApiClient(rootUri: string) {
  const session = await getSession();

  return new ApiClient({
    rootUri,
    token: session?.accessToken,
  });
}
