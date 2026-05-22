import { getClient } from '@/services/sanity/client';
import creditsQuery from '@/services/sanity/queries/credits';
import { logError } from '@/utils/logger';

export type CreditsPack = {
  quantity: string;
  price: number;
  discount: number;
  pricePerCredit: number;
};

export async function getCreditsPacks(): Promise<CreditsPack[]> {
  try {
    const data = await getClient().fetch<CreditsPack[]>(creditsQuery);
    return data ?? [];
  } catch (error) {
    logError('Failed to fetch credits packs from Sanity:', error);
    return [];
  }
}
