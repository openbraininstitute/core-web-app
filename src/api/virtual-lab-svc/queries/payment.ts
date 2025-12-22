import type {
  SetupIntentResponse,
  StandalonePaymentRequest,
  StandalonePaymentResponse,
  SubscriptionPaymentsResponse,
} from '@/api/virtual-lab-svc/queries/types';
import { getSession } from '@/auth-fetch';
import { config } from '@/config';

function getPaymentsPrl() {
  return `${config.VIRTUAL_LAB_API_URL}/payments`;
}

function getSubscriptionUrl() {
  return `${config.VIRTUAL_LAB_API_URL}/subscriptions`;
}

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
  const url = `${getPaymentsPrl()}/setup-intent`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Listing subscriptions failed`, {
      cause: await response.json(),
    });
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
  const response = await fetch(`${getPaymentsPrl()}/standalone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to create standalone payment', {
      cause: await response.json(),
    });
  }

  const data = await response.json();
  return data.data;
}

/**
 * get subscription payment history with pagination
 *
 * @param {Object} params - Pagination parameters
 * @param {number} [params.page=1] - Page number (1-indexed)
 * @param {number} [params.pageSize=10] - Number of items per page
 * @returns {Promise<SubscriptionPaymentsResponse>} - Paginated list of subscription payments
 * @throws {Error} - Throws an error if the request fails
 */
export async function listStandalonePayments({
  page = 1,
  pageSize = 5,
  virtualLabId,
}: {
  page?: number;
  pageSize?: number;
  virtualLabId?: string;
}): Promise<SubscriptionPaymentsResponse> {
  const session = await getSession();

  // Build the URL with query parameters
  const url = new URL(`${getSubscriptionUrl()}/payments`);
  url.searchParams.append('payment_type', 'standalone');
  url.searchParams.append('page', page.toString());
  url.searchParams.append('page_size', pageSize.toString());
  if (virtualLabId) url.searchParams.append('virtual_lab_id', virtualLabId);

  const response = await fetch(url.toString(), {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch subscription payments`, {
      cause: await response.json(),
    });
  }

  return await response.json();
}
