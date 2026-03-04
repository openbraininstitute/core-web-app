import isNil from 'es-toolkit/compat/isNil';
import omitBy from 'es-toolkit/compat/omitBy';

import { ValidationError } from '@/api/error';
import { parseApiError } from '@/api/utils';
import { getSession } from '@/auth-fetch';
import { compactRecord } from '@/utils/dictionary';
import { log } from '@/utils/logger';

import type { ZodType } from 'zod';

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

type ValidationSchemas = {
  queryParams?: ZodType;
  body?: ZodType;
  response?: ZodType;
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
  validation?: ValidationSchemas;
};

// New cache configuration type
type CacheConfiguration = {
  enabled: boolean;
  ttlInSeconds: number;
  cacheName: string;
  excludeUrls?: RegExp[];
};

type ApiClientOptions = {
  rootUri: string;
  token?: string;
  headers?: Record<string, string>;
  config?: RequestConfiguration;
  cache?: CacheConfiguration; // Add cache configuration to options
};

export type { ValidationSchemas };

export type ErrorCause<T extends Record<string, any>> = {
  status: number;
  message: string;
  data: T;
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

  private _cacheConfig?: CacheConfiguration; // Cache configuration

  private requestInterceptors: ((request: Request) => Promise<Request>)[] = [];

  private responseInterceptors: ((response: Response) => Promise<Response>)[] = [];

  constructor({ rootUri: rootUrl, token, headers = {}, config = {}, cache }: ApiClientOptions) {
    this._rootUrl = rootUrl;
    this._headers = headers ?? {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    this._token = token;
    this._timeout = config.timeout;
    this._attempts = config.attempts;
    this._backoff = config.backoff;
    this._retryOnError = config.retryOnError;
    this._retryOnException = config.retryOnException;
    this._cacheConfig = cache; // Store cache configuration
  }

  /**
   * checks if caching should be used for a specific URL
   *
   * @param {string} url - url to check
   * @param {CacheConfiguration} cacheConfig - cache configuration
   * @returns {boolean} whether caching should be used
   */
  private shouldUseCache(url: string, cacheConfig?: CacheConfiguration): boolean {
    if (!cacheConfig?.enabled) return false;

    // check if url is in the exclude list
    if (cacheConfig.excludeUrls) {
      for (const pattern of cacheConfig.excludeUrls) {
        if (pattern.test(url)) return false;
      }
    }

    return true;
  }

  /**
   * checks if a cached response exists and is still valid
   *
   * @param {string} url - url to fetch from cache
   * @param {CacheConfiguration} cacheConfig -  cache configuration
   * @returns {Promise<{ valid: boolean, response: Response | null }>} cache status and response
   */
  private async checkCache(
    url: string,
    cacheConfig: CacheConfiguration
  ): Promise<{
    valid: boolean;
    response: Response | null;
  }> {
    if (typeof caches === 'undefined') {
      return { valid: false, response: null };
    }

    try {
      const cache = await caches.open(cacheConfig.cacheName);
      const cachedResponse = await cache.match(url);

      if (!cachedResponse) {
        return { valid: false, response: null };
      }

      // check if the cache has expired
      const cacheDate = cachedResponse.headers.get('x-cache-timestamp');

      if (!cacheDate) {
        return { valid: false, response: cachedResponse };
      }

      const cacheTimestamp = parseInt(cacheDate, 10);
      const now = Date.now();
      const ageInSeconds = (now - cacheTimestamp) / 1000;

      return {
        valid: ageInSeconds < cacheConfig.ttlInSeconds,
        response: cachedResponse,
      };
    } catch (e) {
      log('warn', 'Cache API access failed:', e);
      return { valid: false, response: null };
    }
  }

  /**
   * stores a response in the cache
   *
   * @param {string} url - url to use as the cache key
   * @param {Response} response - response to cache
   * @param {CacheConfiguration} cacheConfig - cache configuration
   * @returns {Promise<void>}
   */
  private async storeInCache(
    url: string,
    response: Response,
    cacheConfig: CacheConfiguration
  ): Promise<void> {
    if (typeof caches === 'undefined') return;

    try {
      const cache = await caches.open(cacheConfig.cacheName);

      // Clone the response before using it
      const responseToCache = response.clone();

      // Create a new response with our custom timestamp header
      const headers = new Headers(responseToCache.headers);
      headers.set('x-cache-timestamp', Date.now().toString());

      const cachedResponseToStore = new Response(await responseToCache.blob(), {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers,
      });

      await cache.put(url, cachedResponseToStore);
    } catch (e) {
      log('warn', 'Failed to store in cache:', e);
    }
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
    config: RequestConfiguration & {
      cache?: CacheConfiguration;
      asRawResponse?: boolean;
    } = {},
    onAbort?: () => void
  ): Promise<T> {
    let attempt = 0;
    const maxAttempts = config.attempts ?? this._attempts ?? 1;

    // validate input schemas before making the request
    if (options.validation?.queryParams && options.queryParams) {
      const result = options.validation.queryParams.safeParse(options.queryParams);
      if (!result.success) {
        const error = new ValidationError('queryParams', result.error);
        log('error', `fetch [${endpoint}] error:`, error.toJSON());
        throw error;
      }
      log('info', `fetch [${endpoint}] [queryParams] succeeded`);
    }

    if (options.validation?.body && options.body) {
      const result = options.validation.body.safeParse(options.body);
      if (!result.success) {
        const error = new ValidationError('body', result.error);
        log('error', `fetch [${endpoint}] error:`, error.toJSON());
        throw error;
      }
      log('info', `fetch [${endpoint}] [body] succeeded`);
    }

    const url = new URL(`${this._rootUrl}${endpoint}`);

    Object.entries(omitBy(options.queryParams, isNil) || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(`${key}`, `${v}`));
      } else {
        url.searchParams.append(key, String(value));
      }
    });

    const urlString = url.toString();

    // determine if caching should be used for this request
    const requestCacheConfig = config.cache ?? this._cacheConfig;
    const useCache =
      method.toLowerCase() === 'get' &&
      this.shouldUseCache(urlString, requestCacheConfig) &&
      !config.asRawResponse;

    // get from cache first for "get" requests
    if (useCache && requestCacheConfig) {
      const { valid, response: cachedResponse } = await this.checkCache(
        urlString,
        requestCacheConfig
      );

      if (valid && cachedResponse) {
        log('debug', `[cached] ${urlString}`);
        const contentType = cachedResponse.headers.get('Content-Type') || '';
        if (config.asRawResponse) {
          return cachedResponse as unknown as T;
        }
        if (contentType.includes('application/json')) {
          return cachedResponse.json();
        }
        if (contentType.includes('text')) {
          return (await cachedResponse.text()) as unknown as T;
        }
        if (contentType.includes('application/octet-stream')) {
          return (await cachedResponse.blob()) as unknown as T;
        }
        return (await cachedResponse.arrayBuffer()) as unknown as T;
      }

      // if cache is invalid or expired, continue with the request
      if (cachedResponse) {
        log('log', `Cache expired for ${urlString}, fetching fresh data`);
      }
    }

    const runRequest = async (): Promise<T> => {
      attempt++;
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

      if (!response.ok && (config.retryOnError ?? this._retryOnError) && attempt < maxAttempts) {
        const delay = this.calculateBackoff(attempt, config.backoff ?? this._backoff);
        log('log', 'Retrying request in', delay, 'ms');
        await new Promise((resolve) => {
          setTimeout(resolve, delay);
        });
        return runRequest();
      }

      // store successful GET responses in cache if caching is enabled
      if (useCache && response.ok && requestCacheConfig) {
        await this.storeInCache(urlString, response, requestCacheConfig);
      }

      const contentType = response.headers.get('Content-Type') || '';
      let responseData: T;
      if (config.asRawResponse) {
        responseData = response as unknown as T;
      } else if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else if (contentType.includes('text')) {
        responseData = (await response.text()) as unknown as T;
      } else if (contentType.includes('application/octet-stream')) {
        responseData = (await response.blob()) as unknown as T;
      } else {
        responseData = (await response.arrayBuffer()) as unknown as T;
      }

      if (!response.ok) {
        if ((config.retryOnError ?? this._retryOnError) && attempt < maxAttempts) {
          const delay = this.calculateBackoff(attempt, config.backoff ?? this._backoff);

          await new Promise((resolve) => {
            setTimeout(resolve, delay);
          });
          return runRequest();
        }
        log('error', 'Request failed', {
          url: url.toString(),
          status: response.status,
          message: (responseData as any).message || `Request failed with status ${response.status}`,
          data: responseData,
        });
        throw await parseApiError(request.url, response.status, responseData);
      }

      // validate response schema if provided
      if (options.validation?.response && !config.asRawResponse) {
        const result = options.validation.response.safeParse(responseData);
        if (!result.success) {
          const error = new ValidationError('response', result.error);
          log('error', `fetch [${endpoint}] error:`, error.toJSON());
          throw error;
        }
        log('info', `fetch [${endpoint}] [response] succeeded`);
        return result.data as T;
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
        return this._request<T>(method, endpoint, options, {
          ...config,
          attempts: attempt + 1,
        });
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

  /**
   * clears all cached responses or specific URL
   *
   * @param {string} [url] - optional specific url to clear from cache
   * @returns {Promise<boolean>} Whether the operation succeeded
   */
  async clearCache(url?: string): Promise<boolean> {
    if (!this._cacheConfig?.enabled || typeof caches === 'undefined') {
      return false;
    }

    try {
      const cache = await caches.open(this._cacheConfig.cacheName);

      if (url) {
        // Clear specific URL
        const fullUrl = new URL(url, this._rootUrl).toString();
        await cache.delete(fullUrl);
      } else {
        // Clear all cache
        await caches.delete(this._cacheConfig.cacheName);
      }

      return true;
    } catch (e) {
      log('error', 'Failed to clear cache:', e);
      return false;
    }
  }

  get<T>(
    endpoint: string,
    options?: RequestOptions,
    config?: RequestConfiguration & {
      cache?: CacheConfiguration;
      asRawResponse?: boolean;
    }
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
