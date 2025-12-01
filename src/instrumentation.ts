import * as Sentry from '@sentry/nextjs';

// Suppress HMR ping errors in development
if (process.env.NODE_ENV === 'development') {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('unrecognized HMR message') &&
      args[0].includes('"event":"ping"')
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Suppress unhandled rejections for HMR ping errors
  process.on('unhandledRejection', (reason: any) => {
    if (
      reason instanceof Error &&
      reason.message &&
      reason.message.includes('unrecognized HMR message') &&
      reason.message.includes('"event":"ping"')
    ) {
      // Silently ignore HMR ping errors
      return;
    }
    // Re-throw other unhandled rejections
    throw reason;
  });
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
