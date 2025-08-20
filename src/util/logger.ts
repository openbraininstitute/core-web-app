/**
 * @TODO: Use Sentry to log.
 */
export function logError(...args: unknown[]) {
  // Sentry.captureException(ex)

  console.error(...args);
}

/**
 * @TODO: Use Sentry to log.
 */
export function logInfo(...args: unknown[]) {
  console.info(...args);
}
