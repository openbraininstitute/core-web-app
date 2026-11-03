import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  AdminLab,
  AdminLabInvite,
  AdminLabUpdate,
  AdminMember,
  AdminPaymentsPage,
  AdminProject,
  AdminProjectUpdate,
  AdminSubscription,
  AdminUser,
  AdminUserDetails,
  BillingOwner,
  DeletedScope,
  MessageEnvelope,
  Paged,
  PageParams,
  UserRole,
} from './admin-types';

const JSON_HEADERS = { 'Content-Type': 'application/json', accept: 'application/json' };
const ACCEPT_HEADERS = { accept: 'application/json' };

async function getJson<T>(path: string, params?: Record<string, unknown>) {
  const api = await virtualLabRootApi();
  return api.get<T>(`/admin${path}`, {
    headers: ACCEPT_HEADERS,
    ...(params && { queryParams: compactRecord(params) }),
  });
}

async function getEnveloped<T>(path: string) {
  return (await getJson<MessageEnvelope<T>>(path)).data;
}

async function patchJson(path: string, body: Record<string, unknown>) {
  const api = await virtualLabRootApi();
  await api.patch(`/admin${path}`, { headers: JSON_HEADERS, body });
}

async function deleteAt(path: string) {
  const api = await virtualLabRootApi();
  await api.delete(`/admin${path}`, { headers: ACCEPT_HEADERS });
}

async function postJson(path: string, body?: Record<string, unknown>) {
  const api = await virtualLabRootApi();
  await api.post(`/admin${path}`, { headers: JSON_HEADERS, ...(body && { body }) });
}

export const listLabs = (params: PageParams & DeletedScope & { query?: string }) =>
  getJson<Paged<AdminLab>>('/labs', params);

export const getLab = (vlabId: string) => getJson<AdminLab>(`/labs/${vlabId}`);

export const updateLab = (vlabId: string, update: AdminLabUpdate) =>
  patchJson(`/labs/${vlabId}`, update);

export const deleteLab = (vlabId: string) => deleteAt(`/labs/${vlabId}`);

export const getLabMembers = async (vlabId: string) =>
  (await getEnveloped<{ users: AdminMember[] }>(`/labs/${vlabId}/users`)).users;

export const getLabInvites = (vlabId: string) =>
  getJson<AdminLabInvite[]>(`/labs/${vlabId}/invites`);

export const changeLabMemberRole = (vlabId: string, userId: string, newRole: UserRole) =>
  patchJson(`/labs/${vlabId}/users/${userId}/role`, { new_role: newRole });

export const removeLabMember = (vlabId: string, userId: string) =>
  deleteAt(`/labs/${vlabId}/users/${userId}`);

export const cancelLabInvite = (vlabId: string, inviteId: string) =>
  deleteAt(`/labs/${vlabId}/invites/${inviteId}`);

export const listProjects = (
  params: PageParams & DeletedScope & { query?: string; virtual_lab_id?: string }
) => getJson<Paged<AdminProject>>('/projects', params);

export const getProject = (projectId: string) => getJson<AdminProject>(`/projects/${projectId}`);

export const updateProject = (projectId: string, update: AdminProjectUpdate) =>
  patchJson(`/projects/${projectId}`, update);

export const deleteProject = (projectId: string) => deleteAt(`/projects/${projectId}`);

export const restoreProject = (projectId: string) => postJson(`/projects/${projectId}/restore`);

export const getProjectMembers = async (projectId: string) =>
  (await getEnveloped<{ users: AdminMember[] }>(`/projects/${projectId}/users`)).users;

export const changeProjectMemberRole = (projectId: string, userId: string, newRole: UserRole) =>
  patchJson(`/projects/${projectId}/users/${userId}/role`, { new_role: newRole });

export const removeProjectMember = (projectId: string, userId: string) =>
  deleteAt(`/projects/${projectId}/users/${userId}`);

export const searchUsers = (params: PageParams & { query?: string }) =>
  getJson<Paged<AdminUser>>('/users', params);

export const getUser = (userId: string) => getJson<AdminUserDetails>(`/users/${userId}`);

export const listSubscriptions = (params: PageParams & BillingOwner) =>
  getJson<Paged<AdminSubscription>>('/subscriptions', params);

export const cancelSubscription = (subscriptionId: string, reason: string) =>
  postJson(`/subscriptions/${subscriptionId}/cancel`, { reason });

export const listPayments = (params: PageParams & BillingOwner) =>
  getJson<AdminPaymentsPage>('/payments', params);
