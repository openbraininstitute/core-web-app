import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';

import type {
  TOnboardingFeature,
  OnboardingUpdateRequest,
  VlmOnboardingResponse,
} from '@/api/virtual-lab-svc/queries/types';

const baseUri = '/users/preferences/onboarding';

/**
 * fetches all onboarding status for the authenticated user
 *
 * @returns Promise<VlmOnboardingResponse> A promise that resolves with the onboarding status data
 * @throws Will throw an error if the API request fails
 */
export async function getOnboardingStatus(): Promise<VlmOnboardingResponse> {
  const api = await virtualLabRootApi();
  return await api.get<VlmOnboardingResponse>(baseUri);
}

/**
 * updates onboarding status for a specific feature
 *
 * @param {Object} params - The parameters object
 * @param {TOnboardingFeature} params.feature - The feature identifier to update
 * @param {OnboardingUpdateRequest} params.payload - The update payload containing completion status and optional step
 * @returns {Promise<VlmOnboardingResponse>} A promise that resolves with the updated onboarding status data
 * @throws Will throw an error if the API request fails
 */
export async function updateOnboardingStatus({
  feature,
  payload,
}: {
  feature: TOnboardingFeature;
  payload: OnboardingUpdateRequest;
}): Promise<VlmOnboardingResponse> {
  const api = await virtualLabRootApi();
  return await api.put<VlmOnboardingResponse>(`${baseUri}/${feature}`, {
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: payload,
  });
}
