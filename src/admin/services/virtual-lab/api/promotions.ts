import { deleteAt, getEnveloped, postJson, putJson } from './request';

import type {
  AdminPromotion,
  AdminPromotionAnalytics,
  AdminPromotionCreate,
  AdminPromotionUpdate,
  AdminPromotionUsage,
} from './admin-types';

// Unlike the rest of /admin, promotions page by limit and offset, and update with PUT.
export const listPromotions = (params: {
  limit: number;
  offset: number;
  active?: boolean;
  search?: string;
}) =>
  getEnveloped<{ promotions: AdminPromotion[]; pagination: { total: number } }>(
    '/promotions',
    params
  );

export const getPromotion = (id: string) => getEnveloped<AdminPromotion>(`/promotions/${id}`);

export const getPromotionUsage = (id: string) =>
  getEnveloped<AdminPromotionUsage>(`/promotions/${id}/usage`);

export const getPromotionAnalytics = () =>
  getEnveloped<AdminPromotionAnalytics>('/promotions/analytics/system');

export const createPromotion = (promotion: AdminPromotionCreate) =>
  postJson('/promotions', promotion);

export const updatePromotion = (id: string, update: AdminPromotionUpdate) =>
  putJson(`/promotions/${id}`, update);

export const deactivatePromotion = (id: string) => deleteAt(`/promotions/${id}`);
