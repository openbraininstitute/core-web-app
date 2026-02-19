import { getClient } from '@/services/sanity/client';
import pricingQuery from '@/services/sanity/queries/pricing';
import { logError } from '@/util/logger';

import type { AdvantagesProps, PlanV2 } from '@/types/virtual-lab/pricing';

function normalizeFeatures(features: unknown): AdvantagesProps[] {
  if (!Array.isArray(features)) return [];
  return features
    .map((item): AdvantagesProps | null => {
      if (typeof item === 'string' && item.trim()) {
        return { title: item.trim(), tooltip: '' };
      }
      if (item == null || typeof item !== 'object') return null;
      const obj = item as Record<string, unknown>;
      const title =
        typeof obj.title === 'string'
          ? obj.title
          : typeof obj.label === 'string'
            ? obj.label
            : typeof obj.name === 'string'
              ? obj.name
              : '';
      const tooltip =
        typeof obj.tooltip === 'string'
          ? obj.tooltip
          : typeof obj.description === 'string'
            ? obj.description
            : '';
      return title ? { title, tooltip } : null;
    })
    .filter((f): f is AdvantagesProps => f !== null);
}

function normalizeSubscription(sub: unknown): PlanV2['monthly_subscriptions'][number] {
  if (sub == null || typeof sub !== 'object') {
    return { name: '', price: 0, currency: '', features: [] };
  }
  const o = sub as Record<string, unknown>;
  return {
    name: typeof o.name === 'string' ? o.name : '',
    price: typeof o.price === 'number' ? o.price : 0,
    currency: typeof o.currency === 'string' ? o.currency : '',
    has_special_label: typeof o.has_special_label === 'boolean' ? o.has_special_label : undefined,
    special_label: typeof o.special_label === 'string' ? o.special_label : undefined,
    features: normalizeFeatures(o.features),
  };
}

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
      ? plan.monthly_subscriptions.map(normalizeSubscription)
      : [],
    yearly_subscriptions: Array.isArray(plan.yearly_subscriptions)
      ? plan.yearly_subscriptions.map(normalizeSubscription)
      : [],
    support: Array.isArray(plan.support) ? plan.support : [],
  };
}

export async function getPricingContent(): Promise<PlanV2[]> {
  try {
    const data = await getClient().fetch<PlanV2[]>(pricingQuery);

    if (Array.isArray(data)) {
      return data.map(normalizePlan);
    }
    logError('getPricingContent: data is not an array', { dataType: typeof data });
  } catch (err) {
    logError('getPricingContent: error fetching from Sanity', err);
  }

  return [];
}
