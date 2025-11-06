import { NextResponse } from 'next/server';

import { client } from '@/api/sanity/client';
import { logError } from '@/util/logger';

export type CreditsPack = {
  quantity: string;
  price: number;
  discount: number;
  pricePerCredit: number;
};

const queryForCreditsPacks = `*[_type == "credits"][] {
  quantity,
  price,
  discount,
  pricePerCredit
}`;

export async function GET() {
  try {
    const data = await client.fetch<CreditsPack[]>({
      query: queryForCreditsPacks,
    });

    return NextResponse.json({ creditsPacks: data ?? [] });
  } catch (error) {
    logError('Failed to fetch credits packs from Sanity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credits packs', creditsPacks: [] },
      { status: 500 }
    );
  }
}
