import {
  accountingReply,
  forwardToAccounting,
  matchAccountingRoute,
} from '@/admin/server/accounting-proxy';
import { capabilityDenial } from '@/admin/server/require-capability';

import type { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const denial = await capabilityDenial('accounting.admin');
  if (denial) return denial;

  const target = matchAccountingRoute((await params).path, request.nextUrl.searchParams);
  if ('status' in target) return accountingReply(target.status, target.message);

  return forwardToAccounting(target.path, target.search, request.signal);
}
