// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { env } from './env';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  integrations: [Sentry.replayIntegration()],
  tracesSampleRate: 1,
  enableLogs: true,
  replaysSessionSampleRate: env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'production' ? 0.1 : 1,
  replaysOnErrorSampleRate: 1.0,
  debug: !['staging', 'production', 'local'].includes(env.NEXT_PUBLIC_DEPLOYMENT_ENV),
  beforeSend(event) {
    if (
      ['development', 'test', 'preview', 'local'].includes(
        process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || ''
      )
    ) {
      return null;
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
