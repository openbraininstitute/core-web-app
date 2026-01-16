import { getClient } from '@/api/sanity/client';
import pricingQuery from '@/app/api/sanity/pricing-query';
import type { PlanV2 } from '@/types/virtual-lab/pricing';
import { logError } from '@/util/logger';

export type PricingContentProps = PlanV2;

function normalizePlan(plan: PlanV2): PlanV2 {
  return {
    ...plan,
    advantages: Array.isArray(plan.advantages) ? plan.advantages : [],
    general_features: Array.isArray(plan.general_features) ? plan.general_features : [],
    ai_assistant_features: Array.isArray(plan.ai_assistant_features)
      ? plan.ai_assistant_features
      : [],
    build_features: Array.isArray(plan.build_features) ? plan.build_features : [],
    notebooks_features: Array.isArray(plan.notebooks_features) ? plan.notebooks_features : [],
    simulate_features: Array.isArray(plan.simulate_features) ? plan.simulate_features : [],
    monthly_subscriptions: Array.isArray(plan.monthly_subscriptions)
      ? plan.monthly_subscriptions
      : [],
    yearly_subscriptions: Array.isArray(plan.yearly_subscriptions) ? plan.yearly_subscriptions : [],
    support: Array.isArray(plan.support) ? plan.support : [],
  };
}

export async function getPricingContent(): Promise<PlanV2[]> {
  try {
    const data = await getClient().fetch<PlanV2[]>({
      query: pricingQuery,
      config: { cache: 'no-cache' },
    });

    if (Array.isArray(data)) {
      return data.map(normalizePlan);
    }
    logError('getPricingContent: data is not an array', { dataType: typeof data });
  } catch (err) {
    logError('getPricingContent: error fetching from Sanity', err);
  }

  return [];
}
