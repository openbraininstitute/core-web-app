// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

import { config } from './config';

Sentry.init({
  debug: config.DEPLOYMENT_ENV === 'staging',
  dsn: config.SENTRY_DSN,
  enableLogs: true,
  integrations: [Sentry.replayIntegration()],
  release: config.APP_VERSION,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: config.DEPLOYMENT_ENV === 'production' ? 0.1 : 1,
  tracesSampleRate: 1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
