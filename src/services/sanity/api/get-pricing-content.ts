import { normalizePricingPlan } from '@/services/pricing/normalize-plan';
import { getClient } from '@/services/sanity/client';
import pricingQuery from '@/services/sanity/queries/pricing';
import { logError } from '@/utils/logger';

import type { PlanV2 } from '@/types/virtual-lab/pricing';

export async function getPricingContent(): Promise<PlanV2[]> {
  try {
    const data = await getClient().fetch<PlanV2[]>(pricingQuery);

    if (Array.isArray(data)) {
      return data.map(normalizePricingPlan);
    }
    logError('getPricingContent: data is not an array', { dataType: typeof data });
  } catch (err) {
    logError('getPricingContent: error fetching from Sanity', err);
  }

  return [];
}
