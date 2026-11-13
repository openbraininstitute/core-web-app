import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';
import { compactRecord } from '@/utils/dictionary';

import type { TUserRole } from '@/api/virtual-lab-svc/validation';
import type { VlmResponse } from '@/types/virtual-lab/common';
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
  Paged,
  PageParams,
} from './admin-types';

const JSON_HEADERS = { 'Content-Type': 'application/json', accept: 'application/json' };
const ACCEPT_HEADERS = { accept: 'application/json' };

// Ids come from the page URL, so each one is encoded as a single path segment.
const at = (strings: TemplateStringsArray, ...ids: string[]) =>
  String.raw({ raw: strings }, ...ids.map(encodeURIComponent));

async function getJson<T>(path: string, params?: Record<string, unknown>, signal?: AbortSignal) {
  const api = await virtualLabRootApi();
  return api.get<T>(`/admin${path}`, {
    headers: ACCEPT_HEADERS,
    signal,
    ...(params && { queryParams: compactRecord(params) }),
  });
}

async function getEnveloped<T>(path: string) {
  return (await getJson<VlmResponse<T>>(path)).data;
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

export const listLabs = (
  params: PageParams & DeletedScope & { query?: string },
  signal?: AbortSignal
) => getJson<Paged<AdminLab>>('/labs', params, signal);

export const getLab = (vlabId: string) => getJson<AdminLab>(at`/labs/${vlabId}`);

export const updateLab = (vlabId: string, update: AdminLabUpdate) =>
  patchJson(at`/labs/${vlabId}`, update);

export const deleteLab = (vlabId: string) => deleteAt(at`/labs/${vlabId}`);

export const getLabMembers = async (vlabId: string) =>
  (await getEnveloped<{ users: AdminMember[] }>(at`/labs/${vlabId}/users`)).users;

export const getLabInvites = (vlabId: string) =>
  getJson<AdminLabInvite[]>(at`/labs/${vlabId}/invites`);

export const changeLabMemberRole = (vlabId: string, userId: string, newRole: TUserRole) =>
  patchJson(at`/labs/${vlabId}/users/${userId}/role`, { new_role: newRole });

export const removeLabMember = (vlabId: string, userId: string) =>
  deleteAt(at`/labs/${vlabId}/users/${userId}`);

export const cancelLabInvite = (vlabId: string, inviteId: string) =>
  deleteAt(at`/labs/${vlabId}/invites/${inviteId}`);

export const listProjects = (
  params: PageParams & DeletedScope & { query?: string; virtual_lab_id?: string },
  signal?: AbortSignal
) => getJson<Paged<AdminProject>>('/projects', params, signal);

export const getProject = (projectId: string) => getJson<AdminProject>(at`/projects/${projectId}`);

export const updateProject = (projectId: string, update: AdminProjectUpdate) =>
  patchJson(at`/projects/${projectId}`, update);

export const deleteProject = (projectId: string) => deleteAt(at`/projects/${projectId}`);

export const restoreProject = (projectId: string) => postJson(at`/projects/${projectId}/restore`);

export const getProjectMembers = async (projectId: string) =>
  (await getEnveloped<{ users: AdminMember[] }>(at`/projects/${projectId}/users`)).users;

export const changeProjectMemberRole = (projectId: string, userId: string, newRole: TUserRole) =>
  patchJson(at`/projects/${projectId}/users/${userId}/role`, { new_role: newRole });

export const removeProjectMember = (projectId: string, userId: string) =>
  deleteAt(at`/projects/${projectId}/users/${userId}`);

export const searchUsers = (params: PageParams & { query?: string }, signal?: AbortSignal) =>
  getJson<Paged<AdminUser>>('/users', params, signal);

export const getUser = (userId: string) => getJson<AdminUserDetails>(at`/users/${userId}`);

export const listSubscriptions = (params: PageParams & BillingOwner, signal?: AbortSignal) =>
  getJson<Paged<AdminSubscription>>('/subscriptions', params, signal);

export const cancelSubscription = (subscriptionId: string, reason: string) =>
  postJson(at`/subscriptions/${subscriptionId}/cancel`, { reason });

// The one list without the usual `{ data, pagination }` shape.
export async function listPayments(params: PageParams & BillingOwner, signal?: AbortSignal) {
  const { payments, total_count: total } = await getJson<AdminPaymentsPage>(
    '/payments',
    params,
    signal
  );
  return { data: payments, pagination: { total } };
}
