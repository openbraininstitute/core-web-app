// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

import { config } from './config';

Sentry.init({
  debug: config.DEPLOYMENT_ENV === 'staging',
  dsn: config.SENTRY_DSN,
  enableLogs: true,
  environment: config.DEPLOYMENT_ENV,
  release: config.APP_VERSION,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: config.DEPLOYMENT_ENV === 'production' ? 0.1 : 1,
  tracesSampleRate: 1,
});

// Replay (~38 KiB gz) is added after the initial load, the lazy-loading pattern from Sentry's docs;
// the replay buffer for errors starts when it arrives, not at page start
import('@sentry/nextjs')
  .then(({ replayIntegration }) => Sentry.addIntegration(replayIntegration()))
  .catch((error: unknown) => Sentry.captureException(error));

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
