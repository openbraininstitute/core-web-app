import { InviteResponse } from '@/api/virtual-lab-svc/queries/types';
import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';

import type { AcceptInviteResponse, InvitationContentResponse } from '@/types/virtual-lab/invites';
import type { Role } from '@/api/virtual-lab-svc/types';

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
  const api = await virtualLabRootApi();
  return await api.post(`/virtual-labs/${virtualLabId}/projects/${projectId}/invites`, {
    headers: {
      'content-type': 'application/json',
    },
    body: { email, role },
  });
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
  const api = await virtualLabRootApi();
  return await api.post(`/virtual-labs/${virtualLabId}/invites`, {
    headers: {
      'content-type': 'application/json',
    },
    body: { email, role },
  });
}

export async function acceptInvite({ token }: { token: string | null }) {
  const api = await virtualLabRootApi();
  return api.post<AcceptInviteResponse>(`/invites?token=${token}`, {
    headers: {
      'content-type': 'application/json',
    },
  });
}

export async function getInviteContent({ token }: { token: string | null }) {
  const api = await virtualLabRootApi();
  return api.get<InvitationContentResponse>(`/invites?token=${token}`);
}
