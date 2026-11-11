import { NextResponse } from 'next/server';

import { getSinglePrices } from '@/services/sanity';

export async function GET() {
  const prices = await getSinglePrices();
  return NextResponse.json({ prices });
}
