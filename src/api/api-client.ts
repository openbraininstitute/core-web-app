import isNil from 'es-toolkit/compat/isNil';
import omitBy from 'es-toolkit/compat/omitBy';

import {
  checkCache,
  clearCache,
  scheduleRevalidation,
  shouldUseCache,
  storeInCache,
} from '@/api/cache-storage';
import { parseApiError } from '@/api/utils';
import { getSession } from '@/auth-fetch';
import { compactRecord } from '@/utils/dictionary';
import { log } from '@/utils/logger';

import type { CacheConfiguration } from '@/api/cache-storage';

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
  headers?: Record<string, string | undefined>;
  queryParams?: Record<
    string,
    string | number | string[] | number[] | null | undefined | boolean | Date | (string | null)[]
  >;
  body?: any;
  signal?: AbortSignal;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
};

type ApiClientOptions = {
  rootUri: string;
  token?: string;
  headers?: Record<string, string>;
  config?: RequestConfiguration;
  cache?: CacheConfiguration;
};

export type ErrorCause<T extends Record<string, any>> = {
  status: number;
  message: string;
  data: T;
};

class ApiClient {
  private _rootUrl: string;

  private _headers: Record<string, string>;

  private _token?: string;

  private _attempts?: number;

  private _backoff?: BackoffStrategy;

  private _retryOnError?: boolean;

  private _retryOnException?: boolean;

  private _cacheConfig?: CacheConfiguration;

  private requestInterceptors: ((request: Request) => Promise<Request>)[] = [];

  private responseInterceptors: ((response: Response) => Promise<Response>)[] = [];

  constructor({ rootUri: rootUrl, token, headers = {}, config = {}, cache }: ApiClientOptions) {
    this._rootUrl = rootUrl;
    this._headers = headers ?? {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    this._token = token;
    this._attempts = config.attempts;
    this._backoff = config.backoff;
    this._retryOnError = config.retryOnError;
    this._retryOnException = config.retryOnException;
    this._cacheConfig = cache;
  }

  private async decodeResponse<T>(response: Response, asRawResponse?: boolean): Promise<T> {
    if (asRawResponse) {
      return response as unknown as T;
    }
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    if (contentType.includes('text')) {
      return (await response.text()) as unknown as T;
    }
    if (contentType.includes('application/octet-stream')) {
      return (await response.blob()) as unknown as T;
    }
    return (await response.arrayBuffer()) as unknown as T;
  }

  private async executeNetworkRequest(
    method: string,
    urlString: string,
    options: RequestOptions
  ): Promise<Response> {
    let request = new Request(urlString, {
      method,
      headers: compactRecord({
        ...this._headers,
        ...(this._token ? { Authorization: `Bearer ${this._token}` } : {}),
        ...options.headers,
      }),
      body: (() => {
        if (!options.body) {
          return undefined;
        }
        if (options.body instanceof FormData) {
          return options.body;
        }
        return JSON.stringify(options.body);
      })(),
      signal: options.signal,
      cache: options.cache,
      next: options.next,
    });

    for (const interceptor of this.requestInterceptors) {
      request = await interceptor(request);
    }

    let response = await fetch(request);

    for (const interceptor of this.responseInterceptors) {
      response = await interceptor(response);
    }

    return response;
  }

  /**
   * makes an http request with optional caching.
   *
   * @template T
   * @param {string} method - http method (GET, POST, etc.)
   * @param {string} endpoint -  endpoint to send the request to
   * @param {RequestOptions} [options] - options for the request
   * @param {RequestConfiguration & { cache?: CacheConfiguration }} [config] - configuration for the request including cache options
   * @param {() => void} [onAbort] - callback function to execute if the request is aborted
   * @returns {Promise<T>} a promise that resolves to the response data
   */
  private async _request<T>(
    method: string,
    endpoint: string,
    options: RequestOptions = {},
    config: RequestConfiguration & { cache?: CacheConfiguration; asRawResponse?: boolean } = {},
    onAbort?: () => void
  ): Promise<T> {
    let attempt = 0;
    const maxAttempts = config.attempts ?? this._attempts ?? 1;

    const url = new URL(`${this._rootUrl}${endpoint}`);

    Object.entries(omitBy(options.queryParams, isNil) || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => void url.searchParams.append(`${key}`, `${v}`));
      } else {
        url.searchParams.append(key, String(value));
      }
    });

    const urlString = url.toString();

    const requestCacheConfig = config.cache ?? this._cacheConfig;
    const useCache =
      method.toLowerCase() === 'get' &&
      shouldUseCache(urlString, requestCacheConfig) &&
      !config.asRawResponse;

    if (useCache && requestCacheConfig) {
      const { state, response: cachedResponse } = await checkCache(urlString, requestCacheConfig);

      if (cachedResponse && (state === 'fresh' || state === 'stale')) {
        log('debug', `[cached:${state}] ${urlString}`);
        if (state === 'stale') {
          scheduleRevalidation(urlString, requestCacheConfig, () =>
            this.executeNetworkRequest(method, urlString, options)
          );
        }
        return this.decodeResponse<T>(cachedResponse, config.asRawResponse);
      }

      if (cachedResponse) {
        log('log', `Cache expired for ${urlString}, fetching fresh data`);
      }
    }

    const runRequest = async (): Promise<T> => {
      attempt++;
      const response = await this.executeNetworkRequest(method, urlString, options);

      if (!response.ok && (config.retryOnError ?? this._retryOnError) && attempt < maxAttempts) {
        const delay = this.calculateBackoff(attempt, config.backoff ?? this._backoff);
        log('log', 'Retrying request in', delay, 'ms');
        await new Promise((resolve) => {
          setTimeout(resolve, delay);
        });
        return runRequest();
      }

      if (useCache && response.ok && requestCacheConfig) {
        await storeInCache(urlString, response, requestCacheConfig);
      }

      const responseData = await this.decodeResponse<T>(response, config.asRawResponse);

      if (!response.ok) {
        if ((config.retryOnError ?? this._retryOnError) && attempt < maxAttempts) {
          const delay = this.calculateBackoff(attempt, config.backoff ?? this._backoff);

          await new Promise((resolve) => {
            setTimeout(resolve, delay);
          });
          return runRequest();
        }
        log('error', 'Request failed', {
          url: urlString,
          status: response.status,
          message: (responseData as any).message || `Request failed with status ${response.status}`,
          data: responseData,
        });
        throw await parseApiError(urlString, response.status, responseData);
      }

      return responseData;
    };

    try {
      return runRequest();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        onAbort?.();
        throw new Error(`Request was aborted`);
      }
      if ((config.retryOnException ?? this._retryOnException) && attempt < maxAttempts) {
        const delay = this.calculateBackoff(attempt, config.backoff ?? this._backoff);
        await new Promise((resolve) => {
          setTimeout(resolve, delay);
        });
        return this._request<T>(method, endpoint, options, { ...config, attempts: attempt + 1 });
      }
      throw error;
    }
  }

  /**
   * calculates the backoff delay based on the attempt number and strategy.
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

  async clearCache(url?: string): Promise<boolean> {
    if (!this._cacheConfig) return false;
    const fullUrl = url ? new URL(url, this._rootUrl).toString() : undefined;
    return clearCache(this._cacheConfig, fullUrl);
  }

  get<T>(
    endpoint: string,
    options?: RequestOptions,
    config?: RequestConfiguration & { cache?: CacheConfiguration; asRawResponse?: boolean }
  ) {
    return this._request<T>('get', endpoint, options, config);
  }

  post<T>(
    endpoint: string,
    options?: RequestOptions,
    config?: RequestConfiguration & { asRawResponse?: boolean }
  ) {
    return this._request<T>('post', endpoint, options, config);
  }

  put<T>(endpoint: string, options?: RequestOptions, config?: RequestConfiguration) {
    return this._request<T>('put', endpoint, options, config);
  }

  patch<T>(endpoint: string, options?: RequestOptions, config?: RequestConfiguration) {
    return this._request<T>('PATCH', endpoint, options, config);
  }

  delete<T>(endpoint: string, options?: RequestOptions, config?: RequestConfiguration) {
    return this._request<T>('delete', endpoint, options, config);
  }
}

/**
 * creates an authenticated API client.
 *
 * @param {string} rootUri - the root url for the api client
 * @param {CacheConfiguration} [cacheConfig] - optional cache configuration
 * @returns {Promise<ApiClient>} a promise that resolves to an instance of ApiClient
 */
export async function authApiClient(rootUri: string, cacheConfig?: CacheConfiguration) {
  const session = await getSession();

  return new ApiClient({
    rootUri,
    token: session?.accessToken,
    cache: cacheConfig,
  });
}

export default authApiClient;
