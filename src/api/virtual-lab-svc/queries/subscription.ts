import { getSession } from '@/authFetch';

import { virtualLabApi } from '@/config';
import {
  SubscriptionStatus,
  CancelSubscriptionRequest,
  CreateSubscriptionRequest,
  VlmNextPaymentResponse,
  VlmGetSubscriptionResponse,
  VlmListSubscriptionResponse,
  VlmUserSubscriptionsResponse,
  VlmCancelSubscriptionResponse,
  VlmSubscriptionStatusResponse,
  VlmCreateSubscriptionResponse,
  VlmActiveSubscriptionResponse,
  VlmListSubscriptionTiersResponse,
  UserSubscriptionsResponse,
  GetSubscriptionResponse,
  CreateSubscriptionResponse,
  CancelSubscriptionResponse,
  SubscriptionDetails,
  SubscriptionTiersResponse,
  UserActiveSubscriptionResponse,
  NextPaymentDateResponse,
  SubscriptionStatusResponse,
} from '@/api/virtual-lab-svc/queries/types';

const BASE_URL = `${virtualLabApi.url}/subscriptions`;
// const BASE_URL = `http://localhost:8000/subscriptions`;

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
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Creating subscription failed: ${response.status}`, {
      cause: await response.json(),
    });
  }

  const result: VlmCreateSubscriptionResponse = await response.json();
  return result.data;
}

/**
 * retrieves details for a specific subscription.
 *
 * @param {string} subscriptionId - The ID of the subscription to retrieve
 * @returns {Promise<VlmGetSubscriptionResponse>} - The subscription details
 * @throws {Error} - Throws an error if the request fails
 */
export async function getSubscription(
  subscriptionId: string
): Promise<GetSubscriptionResponse | null> {
  const session = await getSession();
  const response = await fetch(`${BASE_URL}/${subscriptionId}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Getting subscription details failed: ${response.status}`, {
      cause: await response.json(),
    });
  }

  const result: VlmGetSubscriptionResponse = await response.json();
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
  const response = await fetch(`${BASE_URL}`, {
    method: 'delete',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Canceling subscription failed: ${response.status}`, {
      cause: await response.json(),
    });
  }

  const result: VlmCancelSubscriptionResponse = await response.json();
  return result.data;
}

/**
 * lists subscriptions with optional filtering.
 *
 * @param {Object} params - Optional filter parameters
 * @param {string} [params.virtual_lab_id] - Filter by virtual lab ID
 * @param {string} [params.user_id] - Filter by user ID
 * @param {SubscriptionStatus} [params.status] - Filter by subscription status
 * @returns {Promise<VlmListSubscriptionResponse>} - List of filtered subscriptions
 * @throws {Error} - Throws an error if the request fails
 */
export async function listSubscriptions(params?: {
  status?: SubscriptionStatus;
}): Promise<Array<SubscriptionDetails> | null> {
  const session = await getSession();

  const queryParams = new URLSearchParams();

  if (params?.status) {
    queryParams.append('status', params.status);
  }

  const url = `${BASE_URL}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Listing subscriptions failed: ${response.status}`, {
      cause: await response.json(),
    });
  }

  const result: VlmListSubscriptionResponse = await response.json();
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
  const response = await fetch(`${BASE_URL}/tiers`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Listing subscription plans failed: ${response.status}`, {
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
  const response = await fetch(`${BASE_URL}/active`, {
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
    throw new Error(`Getting user subscription failed: ${response.status}`, {
      cause: await response.json(),
    });
  }

  const result: VlmActiveSubscriptionResponse = await response.json();
  return result.data;
}

/**
 * gets the next payment date for the current user's paid subscription.
 *
 * @returns {Promise<VlmNextPaymentResponse>} - Next payment date information
 * @throws {Error} - Throws an error if the request fails
 */
export async function getNextPaymentDate(): Promise<NextPaymentDateResponse | null> {
  const session = await getSession();
  const response = await fetch(`${BASE_URL}/next-payment`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Getting next payment date failed: ${response.status}`, {
      cause: await response.json(),
    });
  }

  const result: VlmNextPaymentResponse = await response.json();
  return result.data;
}

/**
 * checks if the current user has an active subscription.
 *
 * @returns {Promise<VlmSubscriptionStatusResponse>} - Subscription status information
 * @throws {Error} - Throws an error if the request fails
 */
export async function checkUserSubscription(): Promise<SubscriptionStatusResponse | null> {
  const session = await getSession();
  const response = await fetch(`${BASE_URL}/check`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Checking user subscription failed: ${response.status}`, {
      cause: await response.json(),
    });
  }

  const result: VlmSubscriptionStatusResponse = await response.json();
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
  const response = await fetch(`${BASE_URL}/history`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Listing user subscriptions with payments failed: ${response.status}`, {
      cause: await response.json(),
    });
  }

  const result: VlmUserSubscriptionsResponse = await response.json();
  return result.data;
}
