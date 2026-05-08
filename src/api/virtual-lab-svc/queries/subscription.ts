import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';

import type {
  CancelSubscriptionRequest,
  CancelSubscriptionResponse,
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  SubscriptionTiersResponse,
  UserActiveSubscriptionResponse,
  UserSubscriptionsResponse,
  VlmActiveSubscriptionResponse,
  VlmCancelSubscriptionResponse,
  VlmCreateSubscriptionResponse,
  VlmListSubscriptionTiersResponse,
  VlmUserSubscriptionsResponse,
} from '@/api/virtual-lab-svc/queries/types';

const baseUri = '/subscriptions';

/**
 * creates a new subscription for a virtual lab.
 *
 * @param {CreateSubscriptionRequest} payload - The subscription creation details
 * @returns {Promise<SubscriptionDetails>} - The created subscription details
 * @throws {Error} - Throws an error if the request fails
 */
export async function createSubscription(
  payload: CreateSubscriptionRequest
): Promise<CreateSubscriptionResponse | null> {
  const api = await virtualLabRootApi();
  const result = await api.post<VlmCreateSubscriptionResponse>(baseUri, {
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: payload,
  });
  return result.data;
}

/**
 * cancels a subscription.
 *
 * @param {CancelSubscriptionRequest} request - The cancellation details
 * @returns {Promise<VlmCancelSubscriptionResponse>} - The updated subscription details
 * @throws {Error} - Throws an error if the request fails
 */
export async function cancelSubscription(
  request: CancelSubscriptionRequest
): Promise<CancelSubscriptionResponse | null> {
  const api = await virtualLabRootApi();
  const result = await api.delete<VlmCancelSubscriptionResponse>(baseUri, {
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: request,
  });
  return result.data;
}

/**
 * lists all available subscription plans.
 *
 * @returns {Promise<VlmListSubscriptionTiersResponse>} - List of available subscription plans
 * @throws {Error} - Throws an error if the request fails
 */
export async function listSubscriptionTiers(): Promise<SubscriptionTiersResponse | null> {
  const api = await virtualLabRootApi();
  const result = await api.get<VlmListSubscriptionTiersResponse>(`${baseUri}/tiers`, {
    headers: {
      accept: 'application/json',
    },
  });
  return result.data;
}

/**
 * gets the current user's active subscription details.
 *
 * @returns {Promise<VlmActiveSubscriptionResponse>} - Details of the user's subscription
 * @throws {Error} - Throws an error if the request fails
 */
export async function getUserActiveSubscription(): Promise<UserActiveSubscriptionResponse | null> {
  const api = await virtualLabRootApi();
  const result = await api.get<VlmActiveSubscriptionResponse>(`${baseUri}/active`, {
    headers: {
      accept: 'application/json',
    },
    cache: 'no-store',
  });
  return result.data;
}

/**
 * Lists all subscriptions of the current user with their payment history.
 *
 * @returns {Promise<VlmUserSubscriptionsResponse>} - List of user's subscriptions with payment details
 * @throws {Error} - Throws an error if the request fails
 */
export async function listUserSubscriptionsHistory(): Promise<UserSubscriptionsResponse | null> {
  const api = await virtualLabRootApi();
  const result = await api.get<VlmUserSubscriptionsResponse>(`${baseUri}/history`, {
    headers: {
      accept: 'application/json',
    },
    cache: 'no-store',
  });
  return result.data;
}
