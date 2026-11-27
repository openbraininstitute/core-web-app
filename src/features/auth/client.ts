'use client';

import { customSessionClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { createContext, use } from 'react';

import { KEYCLOAK_PROVIDER_ID, SESSION_REFETCH_INTERVAL_S } from './constants';
import { resolveAuthStatus } from './helpers';

import type { TAuth } from './auth';
import type { TAuthSession, TUseAuthSession } from './types';

const authClient = createAuthClient({
  plugins: [customSessionClient<TAuth>()],
  sessionOptions: { refetchInterval: SESSION_REFETCH_INTERVAL_S },
});

/** The session the server rendered the page with; `undefined` outside `AuthSessionProvider`. */
export const ServerSessionContext = createContext<TAuthSession | null | undefined>(undefined);

/** Seeds the browser's session store, so the first read does not wait for the network. */
export function hydrateAuthSession(session: TAuthSession | null) {
  authClient.hydrateSession(session as Parameters<typeof authClient.hydrateSession>[0]);
}

/** The signed-in user and their access token, kept fresh, for React components. */
export function useAuthSession(): TUseAuthSession {
  const serverSession = use(ServerSessionContext);
  const { data, isPending } = authClient.useSession();
  const session = isPending ? serverSession : data;

  return { data: session ?? null, status: resolveAuthStatus(session) };
}

/** The browser half of `getAuthSession`: waits for the first answer, then reads the store. */
export function getClientAuthSession(): Promise<TAuthSession | null> {
  const store = authClient.$store.atoms.session;

  return new Promise((resolve) => {
    let settled = false;
    const unsubscribe: () => void = store.subscribe(
      (state: { data: TAuthSession | null; isPending: boolean }) => {
        if (state.isPending || settled) return;
        settled = true;
        resolve(state.data);
        queueMicrotask(() => unsubscribe());
      }
    );
  });
}

export async function signInWithKeycloak(callbackURL: string) {
  const { error } = await authClient.signIn.social({ provider: KEYCLOAK_PROVIDER_ID, callbackURL });
  if (error) throw new Error(error.message ?? 'Could not start the sign-in');
}

/** Ends the session in this browser; the other tabs notice and sign out too. */
export async function signOut() {
  const { error } = await authClient.signOut();
  if (error) throw new Error(error.message ?? 'Could not sign out');
}
