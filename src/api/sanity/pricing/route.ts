import type { PlanV2 } from './planv2';

import plansQuery from './planV2.query.groq';

import { client } from '@/api/sanity/client';
import { logError } from '@/util/logger';

export type PricingContentProps = PlanV2;

function transformSanityData(data: unknown): PlanV2 | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  const item = data as Record<string, unknown>;

  const transformed: PlanV2 = {
    name: typeof item.name === 'string' ? item.name : '',
    subtitle: typeof item.subtitle === 'string' ? item.subtitle : '',
    custom_plan: typeof item.custom_plan === 'boolean' ? item.custom_plan : false,
    has_contact_button:
      typeof item.has_contact_button === 'boolean' ? item.has_contact_button : false,
    has_subscription: typeof item.has_subscription === 'boolean' ? item.has_subscription : false,
    has_subtitle: typeof item.has_subtitle === 'boolean' ? item.has_subtitle : false,
    advantages: Array.isArray(item.advantages) ? item.advantages : [],
    general_features: Array.isArray(item.general_features) ? item.general_features : [],
    ai_assistant_features: Array.isArray(item.ai_assistant_features)
      ? item.ai_assistant_features
      : [],
    build_features: Array.isArray(item.build_features) ? item.build_features : [],
    notebooks_features: Array.isArray(item.notebooks_features) ? item.notebooks_features : [],
    simulate_features: Array.isArray(item.simulate_features) ? item.simulate_features : [],
    monthly_subscriptions: Array.isArray(item.monthly_subscriptions)
      ? (item.monthly_subscriptions as PlanV2['monthly_subscriptions'])
      : [],
    yearly_subscriptions: Array.isArray(item.yearly_subscriptions)
      ? (item.yearly_subscriptions as PlanV2['yearly_subscriptions'])
      : [],
    support: Array.isArray(item.support) ? item.support : [],
    planOrder: (() => {
      if (typeof item.planOrder === 'number') {
        return item.planOrder;
      }
      if (typeof item.planOrder === 'string') {
        return parseInt(item.planOrder, 10) || null;
      }
      return null;
    })(),
  };

  return transformed;
}

export async function getPricingContent(): Promise<PlanV2[]> {
  try {
    const data = await client.fetch<PlanV2[]>({
      query: plansQuery,
      config: { cache: 'no-cache' },
    });

    if (Array.isArray(data)) {
      if (data.length === 0) {
        // eslint-disable-next-line no-console
        console.warn(
          'getPricingContent: Sanity returned empty array - no documents found with _type == "planV2"'
        );
        // Try to see what document types exist
        try {
          const allTypes = await client.fetch<Array<{ _type: string }>>({
            query: '*[_type == "planV2" || _type == "plan" || _type == "pricing"] { _type }',
            config: { cache: 'no-cache' },
          });
          // eslint-disable-next-line no-console
          console.log('getPricingContent: available document types', allTypes);
        } catch (typeErr) {
          // eslint-disable-next-line no-console
          console.error('getPricingContent: error checking document types', typeErr);
        }
      }

      const transformed = data
        .map((item, index) => {
          // eslint-disable-next-line no-console
          console.log(`getPricingContent: transforming item ${index}`, {
            item,
            name: item?.name,
            subtitle: item?.subtitle,
            nameType: typeof item?.name,
            subtitleType: typeof item?.subtitle,
          });

          const transformedItem = transformSanityData(item);
          if (!transformedItem) {
            // eslint-disable-next-line no-console
            console.warn(`getPricingContent: item ${index} transformation failed`, {
              originalItem: item,
              name: item?.name,
              subtitle: item?.subtitle,
              nameExists: !!item?.name,
              subtitleExists: !!item?.subtitle,
              reason: !item?.name ? 'missing name (required)' : 'unknown validation failure',
            });
          } else {
            // eslint-disable-next-line no-console
            console.log(`getPricingContent: item ${index} transformed successfully`, {
              name: transformedItem.name,
              subtitle: transformedItem.subtitle,
              hasSubtitle: !!transformedItem.subtitle,
            });
          }
          return transformedItem;
        })
        .filter((item): item is PlanV2 => item !== null);

      // eslint-disable-next-line no-console
      console.log('getPricingContent: final result', {
        originalLength: data.length,
        transformedLength: transformed.length,
        transformed,
      });
      return transformed;
    }
    // eslint-disable-next-line no-console
    console.error('getPricingContent: data is not an array', { data, dataType: typeof data });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('getPricingContent: error fetching from Sanity', err);
    logError('Error fetching pricing content:', err);
  }

  return [];
}
