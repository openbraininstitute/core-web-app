'use client';

import { customSessionClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

// Type-only reference to the server instance so `customSessionClient` infers the
// reshaped session returned by `customSession`. `import type` keeps the server
// module (and its `next/headers` imports) out of the client bundle.
type TServerAuth = typeof import('@/features/auth/server').serverAuth;

// Same cadence as the old next-auth SessionProvider. Each poll re-runs the server
// `customSession`, which renews the Keycloak access token near expiry and re-syncs the
// auth-manager. Better Auth only polls while a session exists and already refetches on
// window focus, so this replaces the app's own setInterval with fewer requests.
const SESSION_REFETCH_INTERVAL_S = 2 * 60;

export const authClient = createAuthClient({
  plugins: [customSessionClient<TServerAuth>()],
  sessionOptions: { refetchInterval: SESSION_REFETCH_INTERVAL_S },
});
