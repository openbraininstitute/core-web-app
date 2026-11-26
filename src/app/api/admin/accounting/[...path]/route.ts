import { AuditPhase } from '@/admin/sections/accounting/types';
import {
  accountingReply,
  auditAccountingWrite,
  forwardAccountingWrite,
  forwardToAccounting,
  isAdminPageWrite,
  matchAccountingRoute,
  readWriteBody,
} from '@/admin/server/accounting-proxy';
import { capabilityDenial, writeAccess } from '@/admin/server/require-capability';

import type { NextRequest } from 'next/server';
import type { TAccountingMethod } from '@/admin/sections/accounting/types';

type TContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: TContext) {
  const denial = await capabilityDenial('accounting.admin');
  if (denial) return denial;

  const target = matchAccountingRoute((await params).path, request.nextUrl.searchParams);
  if ('status' in target) return accountingReply(target.status, target.message);

  return forwardToAccounting(target.path, target.search, { signal: request.signal });
}

async function write(request: NextRequest, { params }: TContext) {
  if (!isAdminPageWrite(request.headers)) {
    return accountingReply(400, "This change didn't come from the admin pages.");
  }
  const access = await writeAccess('accounting.write');
  if ('denial' in access) return access.denial;
  const { operator } = access;

  const method = request.method as TAccountingMethod;
  const segments = (await params).path;
  const refuse = (reply: Response) => {
    auditAccountingWrite({
      phase: AuditPhase.Refused,
      operator: operator.id,
      method,
      path: segments.join('/').slice(0, 200),
      status: reply.status,
    });
    return reply;
  };

  const target = matchAccountingRoute(segments, request.nextUrl.searchParams, method);
  if ('status' in target) return refuse(accountingReply(target.status, target.message));
  if (!target.body) return refuse(accountingReply(405, 'Method not allowed'));

  const body = await readWriteBody(request, target.body);
  if ('status' in body) return refuse(accountingReply(body.status, body.message));

  return forwardAccountingWrite({
    operator,
    method,
    path: target.path,
    body: body.value,
  });
}

export const POST = write;
export const PATCH = write;
export const PUT = write;
export const DELETE = write;
