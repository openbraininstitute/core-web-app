import 'server-only';

import { serverConfig } from '@/config/server';

import {
  AccountStatusBody,
  AssignBody,
  DepleteProjectBody,
  DepleteVlabBody,
  GrantBody,
  MoveBody,
  RefundBody,
  ReverseBody,
  TopUpBody,
} from '../sections/accounting/schemas';
import { AccountingMethod } from '../sections/accounting/types';
import { isGatewayReply } from './service-probe';

import type { ZodType } from 'zod';
import type {
  TAccountingMethod,
  TAccountingRoute,
  TAccountingTarget,
} from '../sections/accounting/types';

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const SAFE_SEGMENT = /^[A-Za-z0-9-]+$/;
const PAGE_PARAMS = ['page', 'page_size'];
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 1_000_000;
const MAX_BODY_BYTES = 4096;
const UPSTREAM_TIMEOUT_MS = 15_000;

const exact = (path: string) => new RegExp(`^${path}$`);
const read = (path: string, query: string[] = []): TAccountingRoute => ({
  method: AccountingMethod.Get,
  pattern: exact(path),
  query,
});
const write = (method: TAccountingMethod, path: string, body: ZodType): TAccountingRoute => ({
  method,
  pattern: exact(path),
  query: [],
  body,
});

/** Every accounting route the proxy forwards. Anything else gets a 404, or a 405 on a known path. */
export const ACCOUNTING_ROUTES: TAccountingRoute[] = [
  read('admin/account/virtual-lab', ['name', 'enabled', ...PAGE_PARAMS]),
  read(`admin/account/virtual-lab/${UUID}/project`, ['enabled', ...PAGE_PARAMS]),
  read(`admin/account/${UUID}`),
  read('admin/journal', [
    'account_id',
    'job_id',
    'transaction_type',
    'transaction_after',
    'transaction_before',
    ...PAGE_PARAMS,
  ]),
  read('admin/job', [
    'vlab_id',
    'proj_id',
    'service_type',
    'service_subtype',
    'status',
    'started_after',
    'started_before',
    ...PAGE_PARAMS,
  ]),
  read(`admin/job/${UUID}`),
  read('balance/system'),
  read(`report/(system|virtual-lab/${UUID}|project/${UUID})`, [
    'started_after',
    'started_before',
    ...PAGE_PARAMS,
  ]),
  write(AccountingMethod.Patch, `admin/account/${UUID}`, AccountStatusBody),
  write(AccountingMethod.Post, 'admin/refund', RefundBody),
  write(AccountingMethod.Post, 'budget/top-up', TopUpBody),
  write(AccountingMethod.Post, 'budget/assign', AssignBody),
  write(AccountingMethod.Post, 'budget/reverse', ReverseBody),
  write(AccountingMethod.Post, 'budget/move', MoveBody),
  write(AccountingMethod.Post, 'budget/grant', GrantBody),
  write(AccountingMethod.Post, 'budget/deplete/project', DepleteProjectBody),
  write(AccountingMethod.Post, 'budget/deplete/virtual-lab', DepleteVlabBody),
];

const isPositiveInt = (value: string | null) => value !== null && /^[1-9]\d*$/.test(value);

function pageProblem(search: URLSearchParams) {
  const page = search.get('page');
  const pageSize = search.get('page_size');
  if (page !== null && (!isPositiveInt(page) || Number(page) > MAX_PAGE)) {
    return `page must be between 1 and ${MAX_PAGE}`;
  }
  if (!isPositiveInt(pageSize) || Number(pageSize) > MAX_PAGE_SIZE) {
    return `page_size must be between 1 and ${MAX_PAGE_SIZE}`;
  }
  return null;
}

export function matchAccountingRoute(
  segments: string[],
  search: URLSearchParams,
  method: string = AccountingMethod.Get
): TAccountingTarget {
  if (!segments.length || !segments.every((segment) => SAFE_SEGMENT.test(segment))) {
    return { status: 404, message: 'Not found' };
  }
  const path = segments.join('/');
  const onPath = ACCOUNTING_ROUTES.filter((candidate) => candidate.pattern.test(path));
  if (!onPath.length) return { status: 404, message: 'Not found' };
  const route = onPath.find((candidate) => candidate.method === method);
  if (!route) return { status: 405, message: 'Method not allowed' };

  const keys = [...search.keys()];
  const allowed = new Set(route.query);
  const unknown = keys.find((key) => !allowed.has(key));
  if (unknown !== undefined) return { status: 400, message: `Unknown query parameter: ${unknown}` };
  if (new Set(keys).size !== keys.length)
    return { status: 400, message: 'Repeated query parameter' };
  const problem = route.query.includes('page_size') ? pageProblem(search) : null;
  if (problem) return { status: 400, message: problem };

  return { path, search, body: route.body };
}

/** Writes come only from the admin pages: same origin, JSON, and the header they always set. */
export function isAdminPageWrite(headers: Headers) {
  return (
    headers.get('sec-fetch-site') === 'same-origin' &&
    headers.get('x-admin-request') === '1' &&
    headers.get('content-type')?.split(';')[0].trim() === 'application/json'
  );
}

/** The body as the route's schema reads it, so only known fields ever reach accounting. */
export async function readWriteBody(
  request: Request,
  schema: ZodType
): Promise<{ value: unknown } | { status: number; message: string }> {
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return { status: 413, message: 'Request body too large' };
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return { status: 413, message: 'Request body too large' };

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { status: 400, message: 'Request body is not JSON' };
  }
  const parsed = schema.safeParse(json);
  if (parsed.success) return { value: parsed.data };
  const [issue] = parsed.error.issues;
  return { status: 400, message: `${issue.path.join('.') || 'body'}: ${issue.message}` };
}

const NO_STORE = { 'cache-control': 'private, no-store' };
const NULL_BODY_STATUSES = [204, 205];

export function accountingReply(status: number, message: string) {
  return Response.json({ message }, { status, headers: NO_STORE });
}

type TWrite = { method: TAccountingMethod; body: string };

const unanswered = (write?: TWrite) =>
  write
    ? accountingReply(
        502,
        "Accounting didn't answer, so this change may or may not have gone through. Check the journal before trying again."
      )
    : accountingReply(502, "Accounting didn't answer.");

/**
 * accounting-service has no auth, so a 401 or 403 is the gateway's and reads as not reachable.
 * A write runs to the end even if the page that sent it goes away.
 */
export async function forwardToAccounting(
  path: string,
  search: URLSearchParams,
  signal?: AbortSignal,
  write?: TWrite
) {
  const base = serverConfig.ACCOUNTING_URL;
  if (!base) return accountingReply(503, "Accounting isn't configured in this environment.");

  const query = search.size ? `?${search}` : '';
  const timeout = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(`${base.replace(/\/+$/, '')}/${path}${query}`, {
      method: write?.method ?? AccountingMethod.Get,
      headers: {
        accept: 'application/json',
        ...(write && { 'content-type': 'application/json' }),
      },
      body: write?.body,
      redirect: 'manual',
      cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch {
    return unanswered(write);
  }

  if (isGatewayReply(upstream) || upstream.status === 401 || upstream.status === 403) {
    await upstream.body?.cancel();
    return accountingReply(502, "Accounting isn't reachable from this environment.");
  }
  if (!upstream.headers.get('content-type')?.includes('json')) {
    await upstream.body?.cancel();
    return accountingReply(502, `Accounting failed with status ${upstream.status}.`);
  }

  try {
    const body = NULL_BODY_STATUSES.includes(upstream.status) ? null : await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { 'content-type': 'application/json', ...NO_STORE },
    });
  } catch {
    return unanswered(write);
  }
}

type TOperator = { id?: string; username?: string };

function audit(entry: Record<string, unknown>) {
  // biome-ignore lint/suspicious/noConsole: the audit trail has to reach production logs
  console.info(
    JSON.stringify({ tag: 'admin-accounting-audit', at: new Date().toISOString(), ...entry })
  );
}

/** Forwards a validated write, with an audit line before it and one with the outcome. */
export async function forwardAccountingWrite({
  operator,
  method,
  path,
  body,
}: {
  operator: TOperator;
  method: TAccountingMethod;
  path: string;
  body: unknown;
}) {
  const entry = { operator: operator.id, username: operator.username, method, path, body };
  audit({ ...entry, phase: 'sent' });
  const reply = await forwardToAccounting(path, new URLSearchParams(), undefined, {
    method,
    body: JSON.stringify(body),
  });
  audit({ ...entry, phase: 'answered', status: reply.status });
  return reply;
}
