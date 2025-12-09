// TODO: Remove this module once auth-manager integration is done in the task launcher.

import { authApiClient } from '@/api/apiClient';

export async function authManagerApi(url?: string) {
  const api = await authApiClient(url ?? 'https://staging.openbraininstitute.org/api/auth-manager');
  return api;
}

export async function requestOfflineTokenConsent() {
  const api = await authManagerApi();

  return api.post<Response>('/v1/offline-token', {
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
}
