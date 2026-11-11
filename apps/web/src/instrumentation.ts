import * as Sentry from '@sentry/nextjs';

export async function register() {
  const isPreviewBuild = !!(process.env.AWS_APP_ID || process.env.AWS_AMPLIFY_BUILD);

  if (isPreviewBuild) {
    // biome-ignore lint/suspicious/noConsole: We want to log this warning in the console for preview builds, since Sentry is not initialized in that environment.
    console.warn('Sentry is not initialized for preview builds');
    return;
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
