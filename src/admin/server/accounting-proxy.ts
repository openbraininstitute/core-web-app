import 'server-only';

import { serverConfig } from '@/config/server';

import { isGatewayReply } from './service-probe';

import type { CapabilityPath } from '../capabilities/types';

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const SAFE_SEGMENT = /^[A-Za-z0-9-]+$/;
const PAGE_PARAMS = ['page', 'page_size'];
const MAX_PAGE_SIZE = 100;
const UPSTREAM_TIMEOUT_MS = 15_000;

const exact = (path: string) => new RegExp(`^${path}$`);

type TAccountingRoute = {
  method: 'GET';
  pattern: RegExp;
  need: CapabilityPath;
  query: string[];
  paged?: boolean;
};

/** Every accounting route the proxy forwards. Anything else gets a 404. */
export const ACCOUNTING_ROUTES: TAccountingRoute[] = [
  {
    method: 'GET',
    pattern: exact('admin/account/virtual-lab'),
    need: 'accounting.admin',
    query: ['name', 'enabled', ...PAGE_PARAMS],
    paged: true,
  },
  {
    method: 'GET',
    pattern: exact(`admin/account/virtual-lab/${UUID}/project`),
    need: 'accounting.admin',
    query: ['enabled', ...PAGE_PARAMS],
    paged: true,
  },
  {
    method: 'GET',
    pattern: exact(`admin/account/${UUID}`),
    need: 'accounting.admin',
    query: [],
  },
  {
    method: 'GET',
    pattern: exact('admin/journal'),
    need: 'accounting.admin',
    query: [
      'account_id',
      'job_id',
      'transaction_type',
      'transaction_after',
      'transaction_before',
      ...PAGE_PARAMS,
    ],
    paged: true,
  },
  {
    method: 'GET',
    pattern: exact('admin/job'),
    need: 'accounting.admin',
    query: [
      'vlab_id',
      'proj_id',
      'service_type',
      'service_subtype',
      'status',
      'started_after',
      'started_before',
      ...PAGE_PARAMS,
    ],
    paged: true,
  },
  {
    method: 'GET',
    pattern: exact(`admin/job/${UUID}`),
    need: 'accounting.admin',
    query: [],
  },
  {
    method: 'GET',
    pattern: exact('balance/system'),
    need: 'accounting.admin',
    query: [],
  },
  {
    method: 'GET',
    pattern: exact(`report/(system|virtual-lab/${UUID}|project/${UUID})`),
    need: 'accounting.admin',
    query: ['started_after', 'started_before', ...PAGE_PARAMS],
    paged: true,
  },
];

export type TAccountingTarget =
  | { path: string; search: URLSearchParams; need: CapabilityPath }
  | { status: number; message: string };

const isPositiveInt = (value: string | null) => value !== null && /^[1-9]\d*$/.test(value);

function pageProblem(search: URLSearchParams) {
  const page = search.get('page');
  const pageSize = search.get('page_size');
  if (page !== null && !isPositiveInt(page)) return 'page must be a positive whole number';
  if (!isPositiveInt(pageSize) || Number(pageSize) > MAX_PAGE_SIZE) {
    return `page_size must be between 1 and ${MAX_PAGE_SIZE}`;
  }
  return null;
}

export function matchAccountingRoute(
  method: string,
  segments: string[],
  search: URLSearchParams
): TAccountingTarget {
  if (!segments.length || !segments.every((segment) => SAFE_SEGMENT.test(segment))) {
    return { status: 404, message: 'Not found' };
  }
  const path = segments.join('/');
  const onPath = ACCOUNTING_ROUTES.filter((route) => route.pattern.test(path));
  if (!onPath.length) return { status: 404, message: 'Not found' };
  const route = onPath.find((candidate) => candidate.method === method);
  if (!route) return { status: 405, message: 'Method not allowed' };

  const keys = [...search.keys()];
  const unknown = keys.find((key) => !route.query.includes(key));
  if (unknown) return { status: 400, message: `Unknown query parameter: ${unknown}` };
  if (new Set(keys).size !== keys.length)
    return { status: 400, message: 'Repeated query parameter' };
  const problem = route.paged ? pageProblem(search) : null;
  if (problem) return { status: 400, message: problem };

  return { path, search, need: route.need };
}

const NO_STORE = { 'cache-control': 'private, no-store' };

function reply(status: number, message: string) {
  return Response.json({ message }, { status, headers: NO_STORE });
}

// accounting-service has no auth, so a 401 or 403 can only come from the gateway in front of it.
export async function forwardToAccounting(path: string, search: URLSearchParams) {
  const base = serverConfig.ACCOUNTING_URL;
  if (!base) return reply(503, "Accounting isn't configured in this environment.");

  const query = search.size ? `?${search}` : '';
  let upstream: Response;
  try {
    upstream = await fetch(`${base.replace(/\/+$/, '')}/${path}${query}`, {
      headers: { accept: 'application/json' },
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return reply(502, "Accounting didn't answer.");
  }

  if (isGatewayReply(upstream) || upstream.status === 401 || upstream.status === 403) {
    await upstream.body?.cancel();
    return reply(502, "Accounting isn't reachable from this environment.");
  }
  if (!upstream.headers.get('content-type')?.includes('json')) {
    await upstream.body?.cancel();
    return reply(502, `Accounting failed with status ${upstream.status}.`);
  }

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'content-type': 'application/json', ...NO_STORE },
  });
}
