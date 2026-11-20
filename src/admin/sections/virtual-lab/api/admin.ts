import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';
import { compactRecord } from '@/utils/dictionary';

import type { TUserRole } from '@/api/virtual-lab-svc/validation';
import type { VlmResponse } from '@/types/virtual-lab/common';
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
  AdminPromotion,
  AdminPromotionAnalytics,
  AdminPromotionCreate,
  AdminPromotionsPage,
  AdminPromotionUpdate,
  AdminPromotionUsage,
  AdminSubscription,
  AdminUser,
  AdminUserDetails,
  ComputeCell,
  DeletedScope,
  Paged,
  PageParams,
  PaymentFilters,
  PromotionFilters,
  SubscriptionFilters,
} from './admin-types';

const JSON_HEADERS = { 'Content-Type': 'application/json', accept: 'application/json' };
const ACCEPT_HEADERS = { accept: 'application/json' };

// Ids come from the page URL, so each one is encoded as a single path segment.
export const at = (strings: TemplateStringsArray, ...ids: string[]) =>
  String.raw({ raw: strings }, ...ids.map(encodeURIComponent));

// Paths from the service root. Most of these routes sit under /admin, so the helpers below add it.
export async function rootGet<T>(
  path: string,
  params?: Record<string, unknown>,
  signal?: AbortSignal
) {
  const api = await virtualLabRootApi();
  return api.get<T>(path, {
    headers: ACCEPT_HEADERS,
    signal,
    ...(params && { queryParams: compactRecord(params) }),
  });
}

export async function rootSend<T = unknown>(
  method: 'post' | 'patch' | 'put',
  path: string,
  body?: Record<string, unknown>
) {
  const api = await virtualLabRootApi();
  return api[method]<T>(path, { headers: JSON_HEADERS, ...(body && { body }) });
}

export async function rootDelete(path: string) {
  const api = await virtualLabRootApi();
  await api.delete(path, { headers: ACCEPT_HEADERS });
}

const getJson = <T>(path: string, params?: Record<string, unknown>, signal?: AbortSignal) =>
  rootGet<T>(`/admin${path}`, params, signal);

async function getEnveloped<T>(
  path: string,
  params?: Record<string, unknown>,
  signal?: AbortSignal
) {
  return (await getJson<VlmResponse<T>>(path, params, signal)).data;
}

async function patchJson(path: string, body: Record<string, unknown>) {
  await rootSend('patch', `/admin${path}`, body);
}

async function putJson(path: string, body: Record<string, unknown>) {
  await rootSend('put', `/admin${path}`, body);
}

const deleteAt = (path: string) => rootDelete(`/admin${path}`);

async function postJson(path: string, body?: Record<string, unknown>) {
  await rootSend('post', `/admin${path}`, body);
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

export const listSubscriptions = (params: PageParams & SubscriptionFilters, signal?: AbortSignal) =>
  getJson<Paged<AdminSubscription>>('/subscriptions', params, signal);

export const cancelSubscription = (subscriptionId: string, reason: string) =>
  postJson(at`/subscriptions/${subscriptionId}/cancel`, { reason });

// The one list without the usual `{ data, pagination }` shape.
export async function listPayments(params: PageParams & PaymentFilters, signal?: AbortSignal) {
  const { payments, total_count: total } = await getJson<AdminPaymentsPage>(
    '/payments',
    params,
    signal
  );
  return { data: payments, pagination: { total } };
}

export const listPlans = (signal?: AbortSignal) =>
  getJson<AdminPlan[]>('/plans', undefined, signal);

export const updatePlan = (planId: string, update: AdminPlanUpdate) =>
  patchJson(at`/plans/${planId}`, update);

export const listCreditRates = (signal?: AbortSignal) =>
  getJson<AdminCreditRate[]>('/credit-rates', undefined, signal);

export const updateCreditRate = (rateId: string, update: AdminCreditRateUpdate) =>
  patchJson(at`/credit-rates/${rateId}`, update);

// Outside /admin: the admin API has no compute-cell route.
export async function updateComputeCell(vlabId: string, computeCell: ComputeCell) {
  await rootSend('patch', at`/virtual-labs/${vlabId}/compute-cell`, { compute_cell: computeCell });
}

// Unlike the rest of /admin, promotions page by limit and offset, and update with PUT.
export async function listPromotions(
  params: Required<Pick<PageParams, 'page' | 'page_size'>> & PromotionFilters,
  signal?: AbortSignal
) {
  const { page, page_size: pageSize, active, search } = params;
  const { promotions, pagination } = await getEnveloped<AdminPromotionsPage>(
    '/promotions',
    { active, search, limit: pageSize, offset: (page - 1) * pageSize },
    signal
  );
  return { data: promotions, pagination };
}

export const getPromotion = (promotionId: string, signal?: AbortSignal) =>
  getEnveloped<AdminPromotion>(at`/promotions/${promotionId}`, undefined, signal);

export const getPromotionUsage = (promotionId: string, signal?: AbortSignal) =>
  getEnveloped<AdminPromotionUsage>(at`/promotions/${promotionId}/usage`, undefined, signal);

export const getPromotionAnalytics = (signal?: AbortSignal) =>
  getEnveloped<AdminPromotionAnalytics>('/promotions/analytics/system', undefined, signal);

export const createPromotion = (promotion: AdminPromotionCreate) =>
  postJson('/promotions', promotion);

export const updatePromotion = (promotionId: string, update: AdminPromotionUpdate) =>
  putJson(at`/promotions/${promotionId}`, update);

export const deactivatePromotion = (promotionId: string) =>
  deleteAt(at`/promotions/${promotionId}`);
