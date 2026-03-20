import { getSession } from '@/auth-fetch';
import { config } from '@/config';

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

function getBaseUrl() {
  return `${config.VIRTUAL_LAB_API_URL}/subscriptions`;
}

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
  const session = await getSession();
  const response = await fetch(getBaseUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Creating subscription failed`, {
      cause: await response.json(),
    });
  }

  const result: VlmCreateSubscriptionResponse = await response.json();
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
  const session = await getSession();
  const response = await fetch(getBaseUrl(), {
    method: 'delete',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Canceling subscription failed`, {
      cause: await response.json(),
    });
  }

  const result: VlmCancelSubscriptionResponse = await response.json();
  return result.data;
}

/**
 * lists all available subscription plans.
 *
 * @returns {Promise<VlmListSubscriptionTiersResponse>} - List of available subscription plans
 * @throws {Error} - Throws an error if the request fails
 */
export async function listSubscriptionTiers(): Promise<SubscriptionTiersResponse | null> {
  const session = await getSession();
  const response = await fetch(`${getBaseUrl()}/tiers`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Listing subscription plans failed`, {
      cause: await response.json(),
    });
  }
  const result: VlmListSubscriptionTiersResponse = await response.json();
  return result.data;
}

/**
 * gets the current user's active subscription details.
 *
 * @returns {Promise<VlmActiveSubscriptionResponse>} - Details of the user's subscription
 * @throws {Error} - Throws an error if the request fails
 */
export async function getUserActiveSubscription(): Promise<UserActiveSubscriptionResponse | null> {
  const session = await getSession();
  const response = await fetch(`${getBaseUrl()}/active`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    cache: 'no-store',
    next: {
      tags: ['active-subscription'],
    },
  });

  if (!response.ok) {
    throw new Error(`Getting user subscription failed`, {
      cause: await response.json(),
    });
  }

  const result: VlmActiveSubscriptionResponse = await response.json();
  return result.data;
}

/**
 * Lists all subscriptions of the current user with their payment history.
 *
 * @returns {Promise<VlmUserSubscriptionsResponse>} - List of user's subscriptions with payment details
 * @throws {Error} - Throws an error if the request fails
 */
export async function listUserSubscriptionsHistory(): Promise<UserSubscriptionsResponse | null> {
  const session = await getSession();
  const response = await fetch(`${getBaseUrl()}/history`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    cache: 'no-store',
    next: {
      tags: ['list-subscriptions'],
    },
  });

  if (!response.ok) {
    throw new Error(`Listing user subscriptions with payments failed`, {
      cause: await response.json(),
    });
  }

  const result: VlmUserSubscriptionsResponse = await response.json();
  return result.data;
}
