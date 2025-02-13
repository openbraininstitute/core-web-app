import { getSession } from 'next-auth/react';

import { InviteResponse } from '@/api/virtual-lab-svc/queries/types';
import { virtualLabApi } from '@/config';
import { Role } from '@/api/virtual-lab-svc/types';

export async function inviteToProject({
  virtualLabId,
  projectId,
  email,
  role,
}: {
  virtualLabId: string;
  projectId: string;
  email: string;
  role: Role;
}): Promise<InviteResponse> {
  const session = await getSession();
  try {
    const response = await fetch(
      `${virtualLabApi.url}/virtual-labs/${virtualLabId}/projects/${projectId}/invites`,
      {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          email,
          role,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(
        `Inviting ${email} as ${role} to project failed: ${response.status} - ${errorBody?.message || 'Unknown error'}`
      );
    }

    const result: InviteResponse = await response.json();
    return result;
  } catch (error) {
    // TODO: capture exception with sentry
    // eslint-disable-next-line no-console
    console.error('Error inviting to project:', error);
    throw new Error(`Failed to invite user to project: ${(error as Error).message}`);
  }
}

export async function inviteToVirtualLab({
  virtualLabId,
  email,
  role,
}: {
  virtualLabId: string;
  email: string;
  role: Role;
}): Promise<InviteResponse> {
  const session = await getSession();
  try {
    const response = await fetch(`${virtualLabApi.url}/virtual-labs/${virtualLabId}/invites`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.accessToken}`,
      },
      body: JSON.stringify({
        email,
        role,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(
        `Inviting ${email} as ${role} to virtual lab failed: ${response.status} - ${errorBody?.message || 'Unknown error'}`
      );
    }

    const result: InviteResponse = await response.json();
    return result;
  } catch (error) {
    // TODO: capture exception with sentry
    // eslint-disable-next-line no-console
    console.error('Error inviting to project:', error);
    throw new Error(`Failed to invite user to project: ${(error as Error).message}`);
  }
}
