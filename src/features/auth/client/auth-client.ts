'use client';

import { customSessionClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

// Type-only reference to the server instance so `customSessionClient` infers the
// reshaped session returned by `customSession`. `import type` keeps the server
// module (and its `next/headers` imports) out of the client bundle.
type TServerAuth = typeof import('@/features/auth/server').serverAuth;

export const authClient = createAuthClient({
  plugins: [customSessionClient<TServerAuth>()],
});
