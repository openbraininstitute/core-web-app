import { getSession } from 'next-auth/react';
import { virtualLabApi } from '@/config';
import {
    CancelSubscriptionRequest,
    CreateSubscriptionRequest,
    SubscriptionDetails,
    SubscriptionPlan,
    SubscriptionPlansResponse,
    SubscriptionResponse,
    SubscriptionStatus,
    SubscriptionsListResponse,
} from './types';

// const BASE_URL = `${virtualLabApi.url}/subscriptions`;
const BASE_URL = `http://localhost:8000/subscriptions`;

/**
 * Creates a new subscription for a virtual lab.
 *
 * @param {CreateSubscriptionRequest} payload - The subscription creation details
 * @returns {Promise<SubscriptionDetails>} - The created subscription details
 * @throws {Error} - Throws an error if the request fails
 */
export async function createSubscription(payload: CreateSubscriptionRequest): Promise<SubscriptionDetails> {
    const session = await getSession();
    try {
        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.accessToken}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Creating subscription failed: ${response.status}`);
        }

        const result: SubscriptionResponse = await response.json();
        return result.data;
    } catch (error) {
        // TODO: capture exception with sentry
        console.error('Error creating subscription:', error);
        throw new Error(`Failed to create subscription: ${(error as Error).message}`);
    }
}

/**
 * Retrieves details for a specific subscription.
 *
 * @param {string} subscriptionId - The ID of the subscription to retrieve
 * @returns {Promise<SubscriptionDetails>} - The subscription details
 * @throws {Error} - Throws an error if the request fails
 */
export async function getSubscription(subscriptionId: string): Promise<SubscriptionDetails> {
    const session = await getSession();
    try {
        const response = await fetch(`${BASE_URL}/${subscriptionId}`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Getting subscription details failed: ${response.status}`);
        }

        const result: SubscriptionResponse = await response.json();
        return result.data;
    } catch (error) {
        // TODO: capture exception with sentry
        console.error('Error getting subscription:', error);
        throw new Error(`Failed to get subscription details: ${(error as Error).message}`);
    }
}

/**
 * Lists all available subscription plans.
 *
 * @returns {Promise<SubscriptionPlan[]>} - List of available subscription plans
 * @throws {Error} - Throws an error if the request fails
 */
export async function listSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const session = await getSession();
    try {
        const response = await fetch(`${BASE_URL}/plans`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Listing subscription plans failed: ${response.status}`);
        }

        const result: SubscriptionPlansResponse = await response.json();
        return result.data;
    } catch (error) {
        // TODO: capture exception with sentry
        console.error('Error listing subscription plans:', error);
        throw new Error(`Failed to list subscription plans: ${(error as Error).message}`);
    }
}

/**
 * Cancels a subscription.
 *
 * @param {string} subscriptionId - The ID of the subscription to cancel
 * @param {CancelSubscriptionRequest} request - The cancellation details
 * @returns {Promise<SubscriptionDetails>} - The updated subscription details
 * @throws {Error} - Throws an error if the request fails
 */
export async function cancelSubscription(
    subscriptionId: string,
    request: CancelSubscriptionRequest
): Promise<SubscriptionDetails> {
    const session = await getSession();
    try {
        const response = await fetch(`${BASE_URL}/${subscriptionId}/cancel`, {
            method: 'patch',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.accessToken}`,
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`Canceling subscription failed: ${response.status}`);
        }

        const result: SubscriptionResponse = await response.json();
        return result.data;
    } catch (error) {
        // TODO: capture exception with sentry
        console.error('Error canceling subscription:', error);
        throw new Error(`Failed to cancel subscription: ${(error as Error).message}`);
    }
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
export async function listSubscriptions(params?: {
    status?: SubscriptionStatus;
}): Promise<SubscriptionDetails[]> {
    const session = await getSession();
    try {
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
            throw new Error(`Listing subscriptions failed: ${response.status}`);
        }

        const result: SubscriptionsListResponse = await response.json();
        return result.data;
    } catch (error) {
        // TODO: capture exception with sentry
        console.error('Error listing subscriptions:', error);
        throw new Error(`Failed to list subscriptions: ${(error as Error).message}`);
    }
}
