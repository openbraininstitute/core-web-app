import {
  accountingReply,
  forwardAccountingWrite,
  forwardToAccounting,
  isAdminPageWrite,
  matchAccountingRoute,
  readWriteBody,
} from '@/admin/server/accounting-proxy';
import { capabilityDenial } from '@/admin/server/require-capability';
import { auth } from '@/auth';

import type { NextRequest } from 'next/server';
import type { TAccountingMethod } from '@/admin/sections/accounting/types';

type TContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: TContext) {
  const denial = await capabilityDenial('accounting.admin');
  if (denial) return denial;

  const target = matchAccountingRoute((await params).path, request.nextUrl.searchParams);
  if ('status' in target) return accountingReply(target.status, target.message);

  return forwardToAccounting(target.path, target.search, request.signal);
}

async function write(request: NextRequest, { params }: TContext) {
  if (!isAdminPageWrite(request.headers)) {
    return accountingReply(403, "This change didn't come from the admin pages.");
  }
  const denial = await capabilityDenial('accounting.admin', { fresh: true });
  if (denial) return denial;

  const method = request.method as TAccountingMethod;
  const target = matchAccountingRoute((await params).path, request.nextUrl.searchParams, method);
  if ('status' in target) return accountingReply(target.status, target.message);
  if (!target.body) return accountingReply(405, 'Method not allowed');

  const body = await readWriteBody(request, target.body);
  if ('status' in body) return accountingReply(body.status, body.message);

  const session = await auth();
  return forwardAccountingWrite({
    operator: { id: session?.user.id, username: session?.user.username },
    method,
    path: target.path,
    body: body.value,
  });
}

export const POST = write;
export const PATCH = write;
