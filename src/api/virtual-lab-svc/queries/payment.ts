import { getSession } from 'next-auth/react';
import {
  SetupIntentResponse,
  StandalonePaymentRequest,
  StandalonePaymentResponse,
} from '@/api/virtual-lab-svc/queries/types';
import { virtualLabApi } from '@/config';

const BASE_URL = `${virtualLabApi.url}/payments`;
// const BASE_URL = `http://localhost:8000/payments`;

/**
 * Lists subscriptions with optional filtering.
 *
 * @param {Object} params - Optional filter parameters
 * @param {string} [params.virtual_lab_id] - Filter by virtual lab ID
 * @param {string} [params.user_id] - Filter by user ID
 * @param {SubscriptionStatus} [params.status] - Filter by subscription status
 * @returns {Promise<SubscriptionDetails[]>} - List of filtered subscriptions
 * @throws {Error} - Throws an error if the request fails
 */
export async function getSetupIntent(): Promise<SetupIntentResponse> {
  const session = await getSession();
  const url = `${BASE_URL}/setup-intent`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Listing subscriptions failed: ${response.status}`);
  }

  const result: SetupIntentResponse = await response.json();
  return result;
}

/**
 * Creates a standalone payment for the authenticated user
 * @param amount - amount to charge in cents
 * @param currency - currency code (e.g., 'chf')
 * @param payment_method_id - stripe payment method id
 * @returns payment details including receipt URL and card information
 */
export async function createStandalonePayment(
  payload: StandalonePaymentRequest
): Promise<StandalonePaymentResponse> {
  const session = await getSession();
  const response = await fetch(`${BASE_URL}/standalone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create standalone payment');
  }

  const data = await response.json();
  return data.data;
}
