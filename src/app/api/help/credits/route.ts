import { NextResponse } from 'next/server';

import { getCreditsPacks } from '@/services/sanity';

export async function GET() {
  const creditsPacks = await getCreditsPacks();
  return NextResponse.json({ creditsPacks });
}
