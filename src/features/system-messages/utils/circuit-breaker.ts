/**
 * Circuit Breaker Pattern Implementation
 *
 * Implements the circuit breaker pattern to prevent cascading failures
 * when the system messages API is experiencing issues.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is tripped, requests fail immediately
 * - HALF_OPEN: Testing if the service has recovered
 *
 * @module utils/circuit-breaker
 */

import {
  CIRCUIT_BREAKER_RESET_TIMEOUT,
  CIRCUIT_BREAKER_THRESHOLD,
} from "../constants";

// ============================================================================
// Types
// ============================================================================

/**
 * Circuit breaker states.
 */
export type TCircuitState = "closed" | "open" | "half-open";

/**
 * Circuit breaker configuration options.
 */
export interface ICircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in milliseconds before attempting to close the circuit */
  resetTimeout: number;
  /** Optional callback when state changes */
  onStateChange?: (state: TCircuitState) => void;
}

/**
 * Circuit breaker statistics.
 */
export interface ICircuitBreakerStats {
  /** Current circuit state */
  state: TCircuitState;
  /** Number of consecutive failures */
  failures: number;
  /** Number of successful calls */
  successes: number;
  /** Timestamp when circuit was last opened */
  lastFailureTime: number | null;
  /** Timestamp when circuit will attempt to close */
  nextAttemptTime: number | null;
}

// ============================================================================
// Circuit Breaker Error
// ============================================================================

/**
 * Error thrown when the circuit breaker is open.
 */
export class CircuitBreakerOpenError extends Error {
  public readonly nextAttemptTime: number;

  constructor(nextAttemptTime: number) {
    super("Circuit breaker is open - request blocked");
    this.name = "CircuitBreakerOpenError";
    this.nextAttemptTime = nextAttemptTime;
  }
}

// ============================================================================
// Circuit Breaker Class
// ============================================================================

/**
 * Circuit Breaker implementation for API resilience.
 *
 * Usage:
 * ```typescript
 * const breaker = new CircuitBreaker();
 *
 * try {
 *   const result = await breaker.execute(() => fetchMessages());
 * } catch (error) {
 *   if (error instanceof CircuitBreakerOpenError) {
 *     // Circuit is open, use cached data or show error
 *   }
 * }
 * ```
 */
export class CircuitBreaker {
  private state: TCircuitState = "closed";
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly config: ICircuitBreakerConfig;

  /**
   * Creates a new CircuitBreaker instance.
   *
   * @param config - Optional configuration overrides
   */
  constructor(config: Partial<ICircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? CIRCUIT_BREAKER_THRESHOLD,
      resetTimeout: config.resetTimeout ?? CIRCUIT_BREAKER_RESET_TIMEOUT,
      onStateChange: config.onStateChange,
    };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Executes a function with circuit breaker protection.
   *
   * @param fn - The async function to execute
   * @returns The result of the function
   * @throws CircuitBreakerOpenError if the circuit is open
   * @throws The original error if the function fails
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === "open") {
      const nextAttemptTime = this.getNextAttemptTime();
      if (nextAttemptTime && Date.now() < nextAttemptTime) {
        throw new CircuitBreakerOpenError(nextAttemptTime);
      }
      // Time to try again - move to half-open
      this.transitionTo("half-open");
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Returns the current circuit state.
   */
  getState(): TCircuitState {
    return this.state;
  }

  /**
   * Returns circuit breaker statistics.
   */
  getStats(): ICircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.getNextAttemptTime(),
    };
  }

  /**
   * Manually resets the circuit breaker to closed state.
   */
  reset(): void {
    this.clearResetTimer();
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.transitionTo("closed");
  }

  /**
   * Checks if the circuit breaker is allowing requests.
   */
  isAllowingRequests(): boolean {
    if (this.state === "closed" || this.state === "half-open") {
      return true;
    }

    // Check if reset timeout has passed
    const nextAttemptTime = this.getNextAttemptTime();
    return nextAttemptTime !== null && Date.now() >= nextAttemptTime;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Handles a successful call.
   */
  private onSuccess(): void {
    this.successes++;

    if (this.state === "half-open") {
      // Success in half-open state - close the circuit
      this.failures = 0;
      this.transitionTo("closed");
    } else if (this.state === "closed") {
      // Reset failure count on success in closed state
      this.failures = 0;
    }
  }

  /**
   * Handles a failed call.
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === "half-open") {
      // Failure in half-open state - reopen the circuit
      this.transitionTo("open");
      this.scheduleReset();
    } else if (
      this.state === "closed" &&
      this.failures >= this.config.failureThreshold
    ) {
      // Threshold reached - open the circuit
      this.transitionTo("open");
      this.scheduleReset();
    }
  }

  /**
   * Transitions to a new state.
   */
  private transitionTo(newState: TCircuitState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.config.onStateChange?.(newState);
    }
  }

  /**
   * Schedules the circuit to attempt closing after the reset timeout.
   */
  private scheduleReset(): void {
    this.clearResetTimer();
    this.resetTimer = setTimeout(() => {
      if (this.state === "open") {
        this.transitionTo("half-open");
      }
    }, this.config.resetTimeout);
  }

  /**
   * Clears the reset timer.
   */
  private clearResetTimer(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  /**
   * Calculates the next attempt time.
   */
  private getNextAttemptTime(): number | null {
    if (this.state !== "open" || this.lastFailureTime === null) {
      return null;
    }
    return this.lastFailureTime + this.config.resetTimeout;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new CircuitBreaker instance with default configuration.
 *
 * @param config - Optional configuration overrides
 * @returns CircuitBreaker instance
 */
export function createCircuitBreaker(
  config?: Partial<ICircuitBreakerConfig>,
): CircuitBreaker {
  return new CircuitBreaker(config);
}
