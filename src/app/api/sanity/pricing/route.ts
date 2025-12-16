import { NextResponse } from 'next/server';

import { getPricingContent } from '@/api/sanity/pricing/route';
import { logError } from '@/util/logger';

export async function GET() {
  try {
    // eslint-disable-next-line no-console
    console.log('GET /api/sanity/pricing: starting fetch');
    const data = await getPricingContent();
    // eslint-disable-next-line no-console
    console.log('GET /api/sanity/pricing: received data', {
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : 0,
      data,
    });

    const response = { plans: data ?? [] };
    // eslint-disable-next-line no-console
    console.log('GET /api/sanity/pricing: returning response', response);

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('GET /api/sanity/pricing: error', error);
    logError('Failed to fetch pricing from Sanity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing', plans: [] },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
