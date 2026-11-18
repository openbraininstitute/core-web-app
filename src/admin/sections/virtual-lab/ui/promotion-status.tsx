import { StatusPill } from '../../../shared/status-pill';

import type { AdminPromotion } from '../api/admin-types';

// The API's `active` only says it wasn't switched off: the code may be outside its dates.
export function PromotionStatus({ promotion }: { promotion: AdminPromotion }) {
  const now = new Date();

  if (!promotion.active) return <StatusPill tone="neutral">Switched off</StatusPill>;
  if (new Date(promotion.valid_until) < now) {
    return <StatusPill tone="warn">Expired</StatusPill>;
  }
  if (new Date(promotion.valid_from) > now) {
    return <StatusPill tone="neutral">Scheduled</StatusPill>;
  }
  if (
    promotion.max_total_uses !== null &&
    promotion.current_total_uses >= promotion.max_total_uses
  ) {
    return <StatusPill tone="warn">Used up</StatusPill>;
  }
  return <StatusPill tone="good">Active</StatusPill>;
}

export const promotionUses = ({ current_total_uses: used, max_total_uses: max }: AdminPromotion) =>
  max === null ? `${used}, no limit` : `${used} of ${max}`;
