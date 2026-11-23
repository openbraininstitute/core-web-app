import {
  accountingReply,
  auditAccountingWrite,
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
  const method = request.method as TAccountingMethod;
  const segments = (await params).path;
  const refuse = (reply: Response, operator?: string) => {
    auditAccountingWrite({
      phase: 'refused',
      operator,
      method,
      path: segments.join('/').slice(0, 200),
      status: reply.status,
    });
    return reply;
  };

  if (!isAdminPageWrite(request.headers)) {
    return refuse(accountingReply(403, "This change didn't come from the admin pages."));
  }
  const denial = await capabilityDenial('accounting.admin', { fresh: true });
  if (denial) return refuse(denial);
  const session = await auth();
  const operator = session?.user.id;
  if (!operator) return refuse(accountingReply(401, 'Sign in again'));

  const target = matchAccountingRoute(segments, request.nextUrl.searchParams, method);
  if ('status' in target) return refuse(accountingReply(target.status, target.message), operator);
  if (!target.body) return refuse(accountingReply(405, 'Method not allowed'), operator);

  const body = await readWriteBody(request, target.body);
  if ('status' in body) return refuse(accountingReply(body.status, body.message), operator);

  return forwardAccountingWrite({
    operator: { id: operator, username: session.user.username },
    method,
    path: target.path,
    body: body.value,
  });
}

export const POST = write;
export const PATCH = write;
