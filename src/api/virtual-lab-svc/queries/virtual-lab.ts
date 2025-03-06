import { getSession } from 'next-auth/react';
import uniqBy from 'lodash/uniqBy';

import { VirtualLabPayload } from '@/api/virtual-lab-svc/types';
import {
  VirtualLabExistsVerificationResponse,
  VirtualLabListResponse,
  VirtualLabResponse,
} from '@/api/virtual-lab-svc/queries/types';
import { virtualLabApi } from '@/config';


// const BASE_URL = virtualLabApi.url;
const BASE_URL = "http://localhost:8000"
/**
 * Checks if a virtual lab with the given name already exists.
 *
 * @param {string} name - The name of the virtual lab.
 * @returns {Promise<boolean>} - Returns `true` if the lab exists, otherwise `false`.
 * @throws {Error} - Throws an error if the API request fails.
 */
export async function checkVirtualLabExists({ name }: { name: string }): Promise<boolean | null> {
  try {
    const session = await getSession();
    if (!session?.accessToken) {
      throw new Error('User session not found. Please log in.');
    }
    const response = await fetch(
      `${BASE_URL}/virtual-labs/_check?q=${encodeURIComponent(name)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJza2hnaTdjRWxFbEJzRFpnZXh1NGlvSzBNV081eGtQbWlXWENYang4eHVrIn0.eyJleHAiOjE4Mjc1NjExMjgsImlhdCI6MTc0MTI0NzUyOCwianRpIjoiOWIzYjQ3NjgtYjkzOS00ODM2LWFiYjItZjJmYzhjODEwZjdjIiwiaXNzIjoiaHR0cDovL2tleWNsb2FrOjkwOTAvcmVhbG1zL29icC1yZWFsbSIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJlMDViOThhYS1mYTRjLTQ0ZjUtODM1Zi0zMjVhMGFlZDY3YzQiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJvYnBhcHAiLCJzZXNzaW9uX3N0YXRlIjoiY2MzMjViYTYtNmFmZi00NDYzLTkxNmYtOThhN2M1ZjE0ZDY4IiwiYWNyIjoiMSIsInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJvZmZsaW5lX2FjY2VzcyIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCIsInNpZCI6ImNjMzI1YmE2LTZhZmYtNDQ2My05MTZmLTk4YTdjNWYxNGQ2OCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoidGVzdCB0ZXN0IiwicHJlZmVycmVkX3VzZXJuYW1lIjoidGVzdCIsImdpdmVuX25hbWUiOiJ0ZXN0IiwiZmFtaWx5X25hbWUiOiJ0ZXN0IiwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIn0.nfQQoXS1tefaHGgndbSKj0RV_tvBTOwj0KElDBtIPnrEpGTuboOjy8w5heBwNwRjeY2aQQq8s9mh-r8Pp7Nz3S2OAoEx1yKj0WJR0xaXm1WO172nb5nzLcS6INBvgtekogjNPg8KxzAMBm2ey6xDED0Yz1Y7m-20c74hX16qWchSxEa-m2OZ23TLHGOBMsn1loEhVlodFAnHosxf-aQf7FHbbjdxG23FgMOLTw_e4PR0I2DtQLJ69bgRwOPaWWZfhXAVMiLyhtw9PCGCvo6vmddvlUG621DY6w963slepla6kdby4DaMAbVr71b8HhDpRd2jH0sg_92YlHgSi9WQXg`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('validating virtual lab name failed');
    }

    const result = (await response.json()) as VirtualLabExistsVerificationResponse;
    return result.data?.exists ?? null;
  } catch (error) {
    // TODO: capture exception with sentry
    throw new Error(`Failed to check virtual lab existence: ${(error as Error).message}`);
  }
}

/**
 * Creates a new virtual lab.
 *
 * @param {Object} params - Parameters for virtual lab creation.
 * @param {VirtualLabPayload} lab - The virtual lab details.
 * @returns {Promise<VirtualLabResponse>} - api response with the created virtual lab.
 * @throws {Error} - Throws an error if the request fails or the response is invalid.
 */
export async function createVirtualLab({ ...lab }: VirtualLabPayload): Promise<VirtualLabResponse> {
  const session = await getSession();
  try {
    const response = await fetch(`${BASE_URL}/virtual-labs`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.accessToken}`,
      },
      body: JSON.stringify({
        ...lab,
        include_members: uniqBy(lab.include_members, (o) => o.email.toLowerCase()),
        // FIXME: should be removed after plans are integrated
        plan_id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`creating virtual lab failed ${response.status}`);
    }

    const result: VirtualLabResponse = await response.json();
    return result;
  } catch (error) {
    // TODO: capture exception with sentry
    // eslint-disable-next-line no-console
    console.error('Error creating virtual lab:', error);
    throw new Error(`Failed to create virtual lab: ${(error as Error).message}`);
  }
}

/**
 * List all virtual labs for a user.
 *
 * @returns {Promise<VirtualLabResponse[]>} - api response with the list of virtual labs.
 * @throws {Error} - Throws an error if the request fails or the response is invalid.
 */
export async function listVirtualLabs(): Promise<VirtualLabListResponse> {
  const session = await getSession();
  try {
    const response = await fetch(`${BASE_URL}/virtual-labs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJza2hnaTdjRWxFbEJzRFpnZXh1NGlvSzBNV081eGtQbWlXWENYang4eHVrIn0.eyJleHAiOjE4Mjc1NjExMjgsImlhdCI6MTc0MTI0NzUyOCwianRpIjoiOWIzYjQ3NjgtYjkzOS00ODM2LWFiYjItZjJmYzhjODEwZjdjIiwiaXNzIjoiaHR0cDovL2tleWNsb2FrOjkwOTAvcmVhbG1zL29icC1yZWFsbSIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJlMDViOThhYS1mYTRjLTQ0ZjUtODM1Zi0zMjVhMGFlZDY3YzQiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJvYnBhcHAiLCJzZXNzaW9uX3N0YXRlIjoiY2MzMjViYTYtNmFmZi00NDYzLTkxNmYtOThhN2M1ZjE0ZDY4IiwiYWNyIjoiMSIsInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJvZmZsaW5lX2FjY2VzcyIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCIsInNpZCI6ImNjMzI1YmE2LTZhZmYtNDQ2My05MTZmLTk4YTdjNWYxNGQ2OCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoidGVzdCB0ZXN0IiwicHJlZmVycmVkX3VzZXJuYW1lIjoidGVzdCIsImdpdmVuX25hbWUiOiJ0ZXN0IiwiZmFtaWx5X25hbWUiOiJ0ZXN0IiwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIn0.nfQQoXS1tefaHGgndbSKj0RV_tvBTOwj0KElDBtIPnrEpGTuboOjy8w5heBwNwRjeY2aQQq8s9mh-r8Pp7Nz3S2OAoEx1yKj0WJR0xaXm1WO172nb5nzLcS6INBvgtekogjNPg8KxzAMBm2ey6xDED0Yz1Y7m-20c74hX16qWchSxEa-m2OZ23TLHGOBMsn1loEhVlodFAnHosxf-aQf7FHbbjdxG23FgMOLTw_e4PR0I2DtQLJ69bgRwOPaWWZfhXAVMiLyhtw9PCGCvo6vmddvlUG621DY6w963slepla6kdby4DaMAbVr71b8HhDpRd2jH0sg_92YlHgSi9WQXg`,
      },
    });

    if (!response.ok) {
      throw new Error(`listing virtual labs failed ${response.status}`);
    }

    const result: VirtualLabListResponse = await response.json();
    return result;
  } catch (error) {
    // TODO: capture exception with sentry
    throw new Error(`Failed to list virtual labs: ${(error as Error).message}`);
  }
}

