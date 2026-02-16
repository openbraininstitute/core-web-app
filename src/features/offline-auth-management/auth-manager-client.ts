import { authApiClient } from '@/api/apiClient';
import { config } from '@/config';

type RawRequestConsentResponse = {
  data?: {
    consent_url?: string;
    session_state_id?: string;
    message?: string;
  };
};

export type OfflineTokenConsentRequest = {
  consentUrl?: string;
  sessionStateId?: string;
  message?: string;
};

/**
 * requests the offline-token consent URL from auth-manager.
 *
 * auth-manager returns a `consent_url` even if consent is already granted; in that case
 * the consent page is expected to complete immediately
 */
export async function requestOfflineTokenConsent(): Promise<OfflineTokenConsentRequest> {
  const api = await authApiClient(config.AUTH_MANAGER_URL);
  const res = await api.get<RawRequestConsentResponse>('/offline-token', {
    headers: { accept: 'application/json' },
  });

  return {
    consentUrl: res?.data?.consent_url,
    sessionStateId: res?.data?.session_state_id,
    message: res?.data?.message,
  };
}
