import { forwardToAccounting, matchAccountingRoute } from '@/admin/server/accounting-proxy';
import { capabilityDenial } from '@/admin/server/require-capability';

import type { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const target = matchAccountingRoute('GET', (await params).path, request.nextUrl.searchParams);
  if ('status' in target) {
    return Response.json({ message: target.message }, { status: target.status });
  }

  const denial = await capabilityDenial(target.need);
  if (denial) return denial;

  return forwardToAccounting(target.path, target.search);
}
