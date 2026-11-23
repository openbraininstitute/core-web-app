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
import { AccountingMethod, AuditPhase } from '../sections/accounting/types';
import { isGatewayReply } from './service-probe';

import type { ZodType } from 'zod';
import type { TOperator } from '../capabilities/types';
import type {
  TAccountingMethod,
  TAccountingRoute,
  TAccountingTarget,
  TAccountingWrite,
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

async function readCapped(request: Request, maxBytes: number) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** The body as the route's schema reads it, so only known fields ever reach accounting. */
export async function readWriteBody(
  request: Request,
  schema: ZodType
): Promise<{ value: unknown } | { status: number; message: string }> {
  const tooLarge = { status: 413, message: 'Request body too large' };
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return tooLarge;
  const text = await readCapped(request, MAX_BODY_BYTES);
  if (text === null) return tooLarge;

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { status: 400, message: 'Request body is not JSON' };
  }
  if (typeof json === 'object' && json !== null && Object.hasOwn(json, '__proto__')) {
    return { status: 400, message: 'body: Unrecognized key: "__proto__"' };
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

const unanswered = (write: boolean) =>
  write
    ? accountingReply(
        502,
        "Accounting didn't answer, so this change may or may not have gone through. Check the journal before trying again."
      )
    : accountingReply(502, "Accounting didn't answer.");

/** A 401 or 403 is the gateway's, since accounting has no auth; a write ignores the page going away. */
export async function forwardToAccounting(
  path: string,
  search: URLSearchParams,
  { signal, write }: { signal?: AbortSignal; write?: TAccountingWrite } = {}
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
    return unanswered(!!write);
  }

  const isJson = upstream.headers.get('content-type')?.includes('json');
  if (write && upstream.ok && !isJson) {
    await upstream.body?.cancel();
    return unanswered(true);
  }
  if (isGatewayReply(upstream) || upstream.status === 401 || upstream.status === 403) {
    await upstream.body?.cancel();
    return accountingReply(502, "Accounting isn't reachable from this environment.");
  }
  if (write && upstream.status >= 500) {
    await upstream.body?.cancel();
    return unanswered(true);
  }
  if (!isJson) {
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
    return unanswered(!!write);
  }
}

/** One JSON line per write event, the trail of who moved which credits. */
export function auditAccountingWrite(entry: Record<string, unknown>) {
  // biome-ignore lint/suspicious/noConsole: the audit trail has to reach production logs
  console.info(
    JSON.stringify({ tag: 'admin-accounting-audit', at: new Date().toISOString(), ...entry })
  );
}

const MOVED_FIELDS = ['journal_id', 'amount', 'total_amount'];

async function movedBy(reply: Response) {
  if (!reply.ok) return undefined;
  const data = await reply
    .clone()
    .json()
    .then((body) => body?.data)
    .catch(() => undefined);
  if (typeof data !== 'object' || data === null) return undefined;
  return Object.fromEntries(
    MOVED_FIELDS.filter((key) => key in data).map((key) => [key, data[key]])
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
  auditAccountingWrite({ ...entry, phase: AuditPhase.Sent });
  const reply = await forwardToAccounting(path, new URLSearchParams(), {
    write: { method, body: JSON.stringify(body) },
  });
  auditAccountingWrite({
    ...entry,
    phase: AuditPhase.Answered,
    status: reply.status,
    moved: await movedBy(reply),
  });
  return reply;
}
