import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';

import { deleteAt, getEnveloped, getJson, JSON_HEADERS, patchJson, postJson } from './request';

import type {
  AdminCreditRate,
  AdminCreditRateUpdate,
  AdminLab,
  AdminLabInvite,
  AdminLabUpdate,
  AdminMember,
  AdminPaymentsPage,
  AdminPlan,
  AdminPlanUpdate,
  AdminProject,
  AdminProjectUpdate,
  AdminSubscription,
  AdminUser,
  AdminUserDetails,
  ComputeCell,
  DeletedScope,
  Paged,
  PageParams,
  PaymentFilters,
  SubscriptionFilters,
  UserRole,
} from './admin-types';

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

export const listSubscriptions = (params: PageParams & SubscriptionFilters) =>
  getJson<Paged<AdminSubscription>>('/subscriptions', params);

export const cancelSubscription = (subscriptionId: string, reason: string) =>
  postJson(`/subscriptions/${subscriptionId}/cancel`, { reason });

export const listPayments = (params: PageParams & PaymentFilters) =>
  getJson<AdminPaymentsPage>('/payments', params);

export const listPlans = () => getJson<AdminPlan[]>('/plans');

export const updatePlan = (planId: string, update: AdminPlanUpdate) =>
  patchJson(`/plans/${planId}`, update);

export const listCreditRates = () => getJson<AdminCreditRate[]>('/credit-rates');

export const updateCreditRate = (rateId: string, update: AdminCreditRateUpdate) =>
  patchJson(`/credit-rates/${rateId}`, update);

// A service-admin route outside /admin: no admin equivalent exists.
export async function updateComputeCell(vlabId: string, computeCell: ComputeCell) {
  const api = await virtualLabRootApi();
  await api.patch(`/virtual-labs/${vlabId}/compute-cell`, {
    headers: JSON_HEADERS,
    body: { compute_cell: computeCell },
  });
}
