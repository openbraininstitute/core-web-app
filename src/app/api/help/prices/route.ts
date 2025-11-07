import { NextResponse } from 'next/server';

import { client } from '@/api/sanity/client';
import { logError } from '@/util/logger';

export type SinglePrice = {
  itemName: string;
  freePrice: string | null;
  proPrice: string | null;
  costUnit: string | null;
  customCostUnit: string | null;
  section: string | null;
};

const queryForSinglePrice = `*[_type == "singlePrice"][] {
  itemName,
  freePrice,
  proPrice,
  costUnit,
  section,
  customCostUnit
}`;

export async function GET() {
  try {
    const data = await client.fetch<SinglePrice[]>({
      query: queryForSinglePrice,
    });

    return NextResponse.json({ prices: data ?? [] });
  } catch (error) {
    logError('Failed to fetch singlePrice from Sanity:', error);
    return NextResponse.json({ error: 'Failed to fetch prices', prices: [] }, { status: 500 });
  }
}
