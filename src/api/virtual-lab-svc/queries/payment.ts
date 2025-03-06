
import { getSession } from 'next-auth/react';
import { virtualLabApi } from '@/config';
import {
    SetupIntentResponse
} from './types';

// const BASE_URL = `${virtualLabApi.url}/payments`;
const BASE_URL = `http://localhost:8000/payments`;


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
    try {
        const url = `${BASE_URL}/setup-intent`;
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJza2hnaTdjRWxFbEJzRFpnZXh1NGlvSzBNV081eGtQbWlXWENYang4eHVrIn0.eyJleHAiOjE4Mjc1ODMzMDksImlhdCI6MTc0MTI2OTcwOSwianRpIjoiZGEyNDJjZWMtMDg0Ny00NGU2LWEwOTItYzlkOTFkMWIwYWIyIiwiaXNzIjoiaHR0cDovL2tleWNsb2FrOjkwOTAvcmVhbG1zL29icC1yZWFsbSIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJlMDViOThhYS1mYTRjLTQ0ZjUtODM1Zi0zMjVhMGFlZDY3YzQiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJvYnBhcHAiLCJzZXNzaW9uX3N0YXRlIjoiMWVkNzE4NWYtY2I2YS00ZTdiLTk3MzMtZTYyMjljYWQyNDcwIiwiYWNyIjoiMSIsInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJvZmZsaW5lX2FjY2VzcyIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCIsInNpZCI6IjFlZDcxODVmLWNiNmEtNGU3Yi05NzMzLWU2MjI5Y2FkMjQ3MCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoidGVzdCB0ZXN0IiwicHJlZmVycmVkX3VzZXJuYW1lIjoidGVzdCIsImdpdmVuX25hbWUiOiJ0ZXN0IiwiZmFtaWx5X25hbWUiOiJ0ZXN0IiwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIn0.jqwIseP-SQk4IHFM3um_qamEvO9CnT4VylfSlJFbFjoEuxng5hp0y28VvuZ7ghDcGzBZiXopltQu3t7jY2eRNE2Px5frTwsUxvLWcuVoFaWHAoYKPVRt_FMKAsL2nspI60zznivh2PhtQvjMeJDB9GXcmo6mzQ9R5jXtABkfZWhbTcRbQztiHXRvvQytKgjxgVmooRWeOaZr_QrkBs184XYRz5NEmum9XGlT2FXWi7ZSbn6YNuQUxXXkmgrj4etwM2cJS7pzzNqoUNM-w-iaAL255wY9dofUqTmGc6pSoHGIi87dXb4eh6l6nnRV_5uf3g2fmtExz5holSI2ZmQ5CA`,
            },
        });

        if (!response.ok) {
            throw new Error(`Listing subscriptions failed: ${response.status}`);
        }

        const result: SetupIntentResponse = await response.json();

        console.log("ᦨ #  payment.ts:39 #  getSetupIntent #  result:", result);

        return result;
    } catch (error) {
        // TODO: capture exception with sentry
        console.error('Error listing subscriptions:', error);
        throw new Error(`Failed to list subscriptions: ${(error as Error).message}`);
    }
}
