import { authApiClient } from '@/api/api-client';

export async function authManagerApi(url?: string) {
  const api = await authApiClient(url ?? 'https://staging.openbraininstitute.org/api/auth-manager');
  return api;
}

type RequestConsentResponse = {
  data: {
    consent_url: string;
    session_state_id: string;
    message: string;
  };
};

export async function requestOfflineTokenConsent() {
  const api = await authManagerApi();

  return api.get<RequestConsentResponse>('/v1/offline-token', {
    headers: { accept: 'application/json' },
  });
}
