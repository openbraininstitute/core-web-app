import { parseApiError } from '@/api/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  TAccount,
  TAccountingJob,
  TAccountingJobDetail,
  TJobFilters,
  TJobReport,
  TJournalEntry,
  TJournalFilters,
  TPageParams,
  TPaginated,
  TParams,
  TProjectAccount,
  TReportFilters,
  TVlabAccount,
  TVlabAccountFilters,
} from './types';

const PROXY_ROOT = '/api/admin/accounting';

async function accountingGet<T>(path: string, params?: TParams, signal?: AbortSignal) {
  const search = new URLSearchParams(
    Object.entries(compactRecord(params)).map(([key, value]) => [key, String(value)])
  );
  const query = search.toString();
  const url = `${PROXY_ROOT}/${path}${query ? `?${query}` : ''}`;
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal });
  if (!response.ok) {
    throw await parseApiError(url, response.status, await response.json().catch(() => null));
  }
  const body = await response.json().catch(() => null);
  if (typeof body !== 'object' || body === null || body.data == null) {
    throw await parseApiError(url, response.status, body);
  }

  return (body as { data: T }).data;
}

const id = encodeURIComponent;

async function paged<Row>(path: string, params: TParams, signal?: AbortSignal) {
  const { items, meta } = await accountingGet<TPaginated<Row>>(path, params, signal);
  return { data: items, pagination: { total: meta.total_items } };
}

export const listVlabAccounts = (params: TVlabAccountFilters & TPageParams, signal?: AbortSignal) =>
  paged<TVlabAccount>('admin/account/virtual-lab', params, signal);

export const listProjectAccounts = (
  { vlabId, ...params }: { vlabId: string } & TPageParams,
  signal?: AbortSignal
) => paged<TProjectAccount>(`admin/account/virtual-lab/${id(vlabId)}/project`, params, signal);

export const getAccount = (accountId: string, signal?: AbortSignal) =>
  accountingGet<TAccount>(`admin/account/${id(accountId)}`, undefined, signal);

export const listJobs = (params: TJobFilters & TPageParams, signal?: AbortSignal) =>
  paged<TAccountingJob>('admin/job', params, signal);

export const getJob = (jobId: string, signal?: AbortSignal) =>
  accountingGet<TAccountingJobDetail>(`admin/job/${id(jobId)}`, undefined, signal);

export const listJournal = (params: TJournalFilters & TPageParams, signal?: AbortSignal) =>
  paged<TJournalEntry>('admin/journal', params, signal);

export const getSystemBalance = (signal?: AbortSignal) =>
  accountingGet<{ balance: string }>('balance/system', undefined, signal);

export function reportPath({ vlabId, projectId }: { vlabId?: string; projectId?: string }) {
  if (projectId) return `report/project/${id(projectId)}`;
  if (vlabId) return `report/virtual-lab/${id(vlabId)}`;
  return 'report/system';
}

export const listReport = (
  { path, ...params }: { path: string } & TReportFilters & TPageParams,
  signal?: AbortSignal
) => paged<TJobReport>(path, params, signal);
