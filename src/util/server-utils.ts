'use server';

import { serverConfig as config } from '@/config/server';
import { getSession } from '@/features/auth/auth-fetch';

/**
 * Ends the Keycloak SSO session. Without an id token (a session whose token refresh failed)
 * there is nothing to end at Keycloak; the local sign-out in `<Logout />` must still run.
 */
export async function keycloakLogout() {
  const session = await getSession();
  const idToken = session?.idToken;
  if (!idToken) return;

  const params = new URLSearchParams({
    client_id: config.KEYCLOAK_CLIENT_ID,
    id_token_hint: idToken,
  });

  return fetch(`${config.KEYCLOAK_ISSUER}/protocol/openid-connect/logout?${params.toString()}`);
}
