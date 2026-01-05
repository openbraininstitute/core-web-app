
import { client } from '@/api/sanity/client';
import { PlanV2 } from '@/types/virtual-lab/pricing';
import { logError } from '@/util/logger';
import plansQuery from '@/ui/segments/plans/planV2.query.groq';

export type PricingContentProps = PlanV2;

export async function getPricingContent(): Promise<PlanV2[]> {
  try {
    const data = await client.fetch<PlanV2[]>({
      query: plansQuery,
      config: { cache: 'no-cache' },
    });

    if (Array.isArray(data)) {
      return data;
    }
    logError('getPricingContent: data is not an array', { dataType: typeof data });
  } catch (err) {
    logError('getPricingContent: error fetching from Sanity', err);
  }

  return [];
}
