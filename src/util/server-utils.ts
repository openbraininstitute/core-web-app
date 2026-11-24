'use server';

import { serverConfig as config } from '@/config/server';
import { getAuthSession } from '@/features/auth/session';

export async function keycloakLogout() {
  const session = await getAuthSession();
  const idToken = session?.idToken;
  if (!idToken) throw new Error("Couldn't locate id token");

  const params = new URLSearchParams({
    client_id: config.KEYCLOAK_CLIENT_ID,
    id_token_hint: idToken,
  });

  return fetch(`${config.KEYCLOAK_ISSUER}/protocol/openid-connect/logout?${params.toString()}`);
}
