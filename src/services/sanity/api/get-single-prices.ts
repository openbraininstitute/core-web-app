import { getClient } from '@/services/sanity/client';
import singlePricesQuery from '@/services/sanity/queries/single-prices';
import { logError } from '@/util/logger';

export type SinglePrice = {
  itemName: string;
  freePrice: string | null;
  proPrice: string | null;
  costUnit: string | null;
  customCostUnit: string | null;
  section: string | null;
};

export async function getSinglePrices(): Promise<SinglePrice[]> {
  try {
    const data = await getClient().fetch<SinglePrice[]>(singlePricesQuery);
    return data ?? [];
  } catch (error) {
    logError('Failed to fetch singlePrice from Sanity:', error);
    return [];
  }
}
