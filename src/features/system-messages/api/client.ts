/**
 * System Messages API Client
 *
 * Provides methods for fetching and managing system messages from the backend API.
 * Implements circuit breaker pattern for resilience and follows existing ApiClient patterns.
 *
 * @module api/client
 */

import { getSession } from "@/auth-fetch";
import { config } from "@/config";
import { log } from "@/utils/logger";

import type {
  IApiError,
  IMessageFilters,
  IPaginatedResponse,
  IPaginationParams,
  ISingleResponse,
  ISystemMessage,
} from "../types";
import {
  type CircuitBreaker,
  CircuitBreakerOpenError,
  createCircuitBreaker,
} from "../utils/circuit-breaker";

// ============================================================================
// Constants
// ============================================================================

/**
 * Base path for system messages API endpoints.
 * Uses the API_ORIGIN from config with a dedicated path.
 */
const API_BASE_PATH = "/api/system-messages";

/**
 * Default request timeout in milliseconds.
 */
const DEFAULT_TIMEOUT = 10000;

// ============================================================================
// Types
// ============================================================================

/**
 * Options for API requests.
 */
export interface IRequestOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** AbortSignal for request cancellation */
  signal?: AbortSignal;
  /** Skip circuit breaker check */
  skipCircuitBreaker?: boolean;
}

/**
 * Response from route check endpoint.
 */
export interface IRouteCheckResponse {
  /** Whether there's a blocking message for this route */
  hasBlockingMessage: boolean;
  /** Message ID if blocking */
  messageId?: string;
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Error thrown when API request fails.
 */
export class SystemMessagesApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: IApiError["details"];
  public readonly retryAfter?: number;

  constructor(status: number, apiError: IApiError) {
    super(apiError.message);
    this.name = "SystemMessagesApiError";
    this.status = status;
    this.code = apiError.code;
    this.details = apiError.details;
    this.retryAfter = apiError.retryAfter;
  }
}

// ============================================================================
// API Client Class
// ============================================================================

/**
 * System Messages API Client.
 *
 * Provides methods for interacting with the system messages backend API.
 * Uses circuit breaker pattern for resilience.
 *
 * Usage:
 * ```typescript
 * const client = new SystemMessagesApiClient();
 *
 * // Get all active messages
 * const messages = await client.getMessages({ status: 'active' });
 *
 * // Get a single message
 * const message = await client.getMessage('msg-123');
 * ```
 */
export class SystemMessagesApiClient {
  private readonly baseUrl: string;
  private readonly circuitBreaker: CircuitBreaker;
  private accessToken: string | null = null;

  /**
   * Creates a new SystemMessagesApiClient instance.
   *
   * @param baseUrl - Optional base URL override (defaults to API_ORIGIN)
   * @param circuitBreaker - Optional circuit breaker instance
   */
  constructor(baseUrl?: string, circuitBreaker?: CircuitBreaker) {
    this.baseUrl = baseUrl ?? this.getDefaultBaseUrl();
    this.circuitBreaker = circuitBreaker ?? createCircuitBreaker();
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Fetches a list of system messages with optional filtering and pagination.
   *
   * @param filters - Optional filters for the query
   * @param pagination - Optional pagination parameters
   * @param options - Optional request options
   * @returns Paginated list of system messages
   *
   * @example
   * ```typescript
   * // Get all active messages
   * const result = await client.getMessages({ status: 'active' });
   *
   * // Get critical and error messages
   * const result = await client.getMessages({
   *   severity: ['critical', 'error'],
   *   status: 'active'
   * });
   * ```
   */
  async getMessages(
    filters?: IMessageFilters,
    pagination?: IPaginationParams,
    options?: IRequestOptions,
  ): Promise<IPaginatedResponse<ISystemMessage>> {
    const queryParams = this.buildQueryParams(filters, pagination);
    const endpoint = queryParams ? `?${queryParams}` : "";

    return this.request<IPaginatedResponse<ISystemMessage>>(
      "GET",
      endpoint,
      undefined,
      options,
    );
  }

  /**
   * Fetches a single system message by ID.
   *
   * @param id - The message ID
   * @param options - Optional request options
   * @returns The system message
   *
   * @example
   * ```typescript
   * const message = await client.getMessage('msg-123');
   * ```
   */
  async getMessage(
    id: string,
    options?: IRequestOptions,
  ): Promise<ISystemMessage> {
    const response = await this.request<ISingleResponse<ISystemMessage>>(
      "GET",
      `/${encodeURIComponent(id)}`,
      undefined,
      options,
    );
    return response.data;
  }

  /**
   * Checks if a route has a blocking message.
   *
   * @param path - The route path to check
   * @param options - Optional request options
   * @returns Route check response
   *
   * @example
   * ```typescript
   * const result = await client.checkRoute('/app/virtual-lab/explore');
   * if (result.hasBlockingMessage) {
   *   // Redirect to system message page
   * }
   * ```
   */
  async checkRoute(
    path: string,
    options?: IRequestOptions,
  ): Promise<IRouteCheckResponse> {
    return this.request<IRouteCheckResponse>(
      "GET",
      `/check-route?path=${encodeURIComponent(path)}`,
      undefined,
      options,
    );
  }

  /**
   * Returns the circuit breaker instance for monitoring.
   */
  getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }

  /**
   * Checks if the API client is allowing requests.
   */
  isAvailable(): boolean {
    return this.circuitBreaker.isAllowingRequests();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Gets the default base URL from config.
   */
  private getDefaultBaseUrl(): string {
    // Use API_ORIGIN if available, otherwise fall back to relative path
    const origin = config.API_ORIGIN ?? "";
    return `${origin}${API_BASE_PATH}`;
  }

  /**
   * Builds query parameters from filters and pagination.
   */
  private buildQueryParams(
    filters?: IMessageFilters,
    pagination?: IPaginationParams,
  ): string {
    const params = new URLSearchParams();

    if (filters) {
      // Handle status filter (can be single value or array)
      if (filters.status) {
        const statuses = Array.isArray(filters.status)
          ? filters.status
          : [filters.status];
        for (const s of statuses) {
          params.append("status", s);
        }
      }

      // Handle severity filter (can be single value or array)
      if (filters.severity) {
        const severities = Array.isArray(filters.severity)
          ? filters.severity
          : [filters.severity];
        for (const s of severities) {
          params.append("severity", s);
        }
      }

      // Handle displayType filter (can be single value or array)
      if (filters.displayType) {
        const displayTypes = Array.isArray(filters.displayType)
          ? filters.displayType
          : [filters.displayType];
        for (const d of displayTypes) {
          params.append("displayType", d);
        }
      }

      // Handle date range filters
      if (filters.startDate) {
        params.append("startDate", filters.startDate);
      }
      if (filters.endDate) {
        params.append("endDate", filters.endDate);
      }

      // Handle includeDeleted flag
      if (filters.includeDeleted) {
        params.append("includeDeleted", "true");
      }
    }

    if (pagination) {
      if (pagination.page !== undefined) {
        params.append("page", String(pagination.page));
      }
      if (pagination.pageSize !== undefined) {
        params.append("pageSize", String(pagination.pageSize));
      }
    }

    return params.toString();
  }

  /**
   * Makes an HTTP request with circuit breaker protection.
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    options?: IRequestOptions,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Combine with external signal if provided
    const signal = options?.signal
      ? this.combineSignals(options.signal, controller.signal)
      : controller.signal;

    const executeRequest = async (): Promise<T> => {
      try {
        // Ensure we have a fresh token
        await this.refreshToken();

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };

        if (this.accessToken) {
          headers.Authorization = `Bearer ${this.accessToken}`;
        }

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal,
        });

        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);
          throw new SystemMessagesApiError(response.status, errorData);
        }

        return await response.json();
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // Execute with or without circuit breaker
    if (options?.skipCircuitBreaker) {
      return executeRequest();
    }

    try {
      return await this.circuitBreaker.execute(executeRequest);
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        log(
          "warn",
          `System messages API circuit breaker is open. Next attempt at ${new Date(error.nextAttemptTime).toISOString()}`,
        );
      }
      throw error;
    }
  }

  /**
   * Refreshes the access token from the session.
   */
  private async refreshToken(): Promise<void> {
    try {
      const session = await getSession();
      this.accessToken = session?.accessToken ?? null;
    } catch (error) {
      log("warn", "Failed to get session for system messages API", error);
      this.accessToken = null;
    }
  }

  /**
   * Parses error response from the API.
   */
  private async parseErrorResponse(response: Response): Promise<IApiError> {
    try {
      const data = await response.json();
      return {
        code: data.code ?? "UNKNOWN_ERROR",
        message:
          data.message ?? `Request failed with status ${response.status}`,
        details: data.details,
        retryAfter: data.retryAfter,
      };
    } catch {
      return {
        code: "PARSE_ERROR",
        message: `Request failed with status ${response.status}`,
      };
    }
  }

  /**
   * Combines multiple AbortSignals into one.
   */
  private combineSignals(
    signal1: AbortSignal,
    signal2: AbortSignal,
  ): AbortSignal {
    const controller = new AbortController();

    const abort = () => controller.abort();

    if (signal1.aborted || signal2.aborted) {
      controller.abort();
    } else {
      signal1.addEventListener("abort", abort);
      signal2.addEventListener("abort", abort);
    }

    return controller.signal;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientInstance: SystemMessagesApiClient | null = null;

/**
 * Gets the singleton SystemMessagesApiClient instance.
 *
 * @returns SystemMessagesApiClient instance
 */
export function getSystemMessagesClient(): SystemMessagesApiClient {
  if (!clientInstance) {
    clientInstance = new SystemMessagesApiClient();
  }
  return clientInstance;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Fetches a list of system messages.
 *
 * @param filters - Optional filters
 * @param pagination - Optional pagination
 * @returns Paginated list of messages
 */
export async function getMessages(
  filters?: IMessageFilters,
  pagination?: IPaginationParams,
): Promise<IPaginatedResponse<ISystemMessage>> {
  return getSystemMessagesClient().getMessages(filters, pagination);
}

/**
 * Fetches a single system message by ID.
 *
 * @param id - Message ID
 * @returns The system message
 */
export async function getMessage(id: string): Promise<ISystemMessage> {
  return getSystemMessagesClient().getMessage(id);
}

/**
 * Checks if a route has a blocking message.
 *
 * @param path - Route path to check
 * @returns Route check response
 */
export async function checkRoute(path: string): Promise<IRouteCheckResponse> {
  return getSystemMessagesClient().checkRoute(path);
}

/**
 * Resets the singleton client instance.
 * Useful for testing or when configuration changes.
 */
export function resetClient(): void {
  clientInstance = null;
}
