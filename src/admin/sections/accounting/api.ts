import { match, P } from 'ts-pattern';

import { ApiError } from '@/api/error';
import { parseApiError } from '@/api/utils';
import { compactRecord } from '@/utils/dictionary';

import { errorReason } from '../../shared/errors';
import { formatDateTime } from '../../shared/format';
import { checkPriceAfter, checkPriceEdit, editMoves, isOutcomeUnknown, priceKey } from './helpers';
import { AccountingErrorCode, AccountingMethod } from './types';

import type {
  TAccount,
  TAccountingJob,
  TAccountingJobDetail,
  TAccountingMethod,
  TAccountStatus,
  TAccountStatusBody,
  TAssignBody,
  TDepleted,
  TDepleteProjectBody,
  TDepleteVlabBody,
  TDiscount,
  TDiscountBody,
  TDiscountFilters,
  TDiscountPatchBody,
  TExpirePriceBody,
  TGrantBody,
  TJobFilters,
  TJobReport,
  TJournalEntry,
  TJournalFilters,
  TMoveBody,
  TPageParams,
  TPaginated,
  TParams,
  TPrice,
  TPriceBody,
  TPriceFilters,
  TPriceLists,
  TPriceScope,
  TProjectAccount,
  TRefund,
  TRefundBody,
  TReportFilters,
  TReverseBody,
  TTopUpBody,
  TVlabAccount,
  TVlabAccountFilters,
} from './types';

const PROXY_ROOT = '/api/admin/accounting';

async function accountingFetch(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw await parseApiError(url, response.status, await response.json().catch(() => null));
  }
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function accountingGet<T>(path: string, params?: TParams, signal?: AbortSignal) {
  const search = new URLSearchParams(
    Object.entries(compactRecord(params)).map(([key, value]) => [key, String(value)])
  );
  const query = search.toString();
  const url = `${PROXY_ROOT}/${path}${query ? `?${query}` : ''}`;
  const { status, body } = await accountingFetch(url, {
    headers: { accept: 'application/json' },
    signal,
  });
  if (typeof body !== 'object' || body === null || body.data == null) {
    throw await parseApiError(url, status, {
      message: 'Accounting sent a reply with no data.',
    });
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
  { vlabId, ...params }: { vlabId: string; enabled?: boolean } & TPageParams,
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

export const listDiscounts = (params: TDiscountFilters & TPageParams, signal?: AbortSignal) =>
  paged<TDiscount>('admin/discount', params, signal);

export const listPrices = (params: TPriceFilters & TPageParams, signal?: AbortSignal) =>
  paged<TPrice>('admin/price', params, signal);

const ONE_PAGE = { page: 1, page_size: 100 };

export const listLabDiscounts = (vlabId: string, signal?: AbortSignal) =>
  listDiscounts({ vlab_id: vlabId, ...ONE_PAGE }, signal);

export const listPricesFor = (scope: TPriceScope, signal?: AbortSignal) =>
  listPrices({ ...priceKey(scope), ...ONE_PAGE }, signal);

export const getPrice = (priceId: number, signal?: AbortSignal) =>
  accountingGet<TPrice>(`admin/price/${priceId}`, undefined, signal);

export const getSystemBalance = (signal?: AbortSignal) =>
  accountingGet<{ balance: string }>('balance/system', undefined, signal);

export const reportPath = (scope: { vlabId?: string; projectId?: string }) =>
  match(scope)
    .with(
      { projectId: P.string.minLength(1) },
      ({ projectId }) => `report/project/${id(projectId)}`
    )
    .with({ vlabId: P.string.minLength(1) }, ({ vlabId }) => `report/virtual-lab/${id(vlabId)}`)
    .otherwise(() => 'report/system');

export const listReport = (
  { path, ...params }: { path: string } & TReportFilters & TPageParams,
  signal?: AbortSignal
) => paged<TJobReport>(path, params, signal);

const UNKNOWN_OUTCOME =
  "The reply didn't arrive, so this change may or may not have gone through. Check the journal, the discounts or the prices list before trying again.";

const isUnanswered = (error: unknown) =>
  !(error instanceof ApiError) || ((error.cause?.status ?? 0) >= 500 && !error.cause?.message);

async function accountingWrite<T = null>(
  path: string,
  body: unknown,
  method: TAccountingMethod = AccountingMethod.Post
) {
  const { body: reply } = await accountingFetch(`${PROXY_ROOT}/${path}`, {
    method,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-admin-request': '1',
    },
    body: JSON.stringify(body),
  }).catch((error) => {
    throw isUnanswered(error)
      ? new ApiError(UNKNOWN_OUTCOME, { code: AccountingErrorCode.OutcomeUnknown })
      : error;
  });

  return (reply?.data ?? null) as T | null;
}

export const setAccountEnabled = (accountId: string, body: TAccountStatusBody) =>
  accountingWrite<TAccountStatus>(`admin/account/${id(accountId)}`, body, AccountingMethod.Patch);

export const refundJob = (body: TRefundBody) => accountingWrite<TRefund>('admin/refund', body);

export const topUp = (body: TTopUpBody) => accountingWrite('budget/top-up', body);

export const assignBudget = (body: TAssignBody) => accountingWrite('budget/assign', body);

export const reverseBudget = (body: TReverseBody) => accountingWrite('budget/reverse', body);

export const moveBudget = (body: TMoveBody) => accountingWrite('budget/move', body);

export const grantBudget = (body: TGrantBody) => accountingWrite('budget/grant', body);

export const depleteProject = (body: TDepleteProjectBody) =>
  accountingWrite<TDepleted>('budget/deplete/project', body);

export const depleteVlab = (body: TDepleteVlabBody) =>
  accountingWrite<TDepleted>('budget/deplete/virtual-lab', body);

export const createDiscount = (body: TDiscountBody) =>
  accountingWrite<TDiscount>('admin/discount', body);

export const updateDiscount = (discountId: number, body: TDiscountPatchBody) =>
  accountingWrite<TDiscount>(`admin/discount/${discountId}`, body, AccountingMethod.Patch);

export const deleteDiscount = (discountId: number) =>
  accountingWrite(`admin/discount/${discountId}`, {}, AccountingMethod.Delete);

export const createPrice = (body: TPriceBody) => accountingWrite<TPrice>('admin/price', body);

export const updatePrice = (priceId: number, body: TPriceBody) =>
  accountingWrite<TPrice>(`admin/price/${priceId}`, body, AccountingMethod.Put);

export const expirePrice = (priceId: number, body: TExpirePriceBody) =>
  accountingWrite<TPrice>(`admin/price/${priceId}/expire`, body);

async function pricesAround(scope: TPriceScope): Promise<TPriceLists> {
  const pages = await Promise.all(
    (scope.vlab_id ? [scope, { ...scope, vlab_id: null }] : [scope]).map((each) =>
      listPricesFor(each)
    )
  );
  return {
    lists: pages.map(({ data }) => data),
    truncated: pages.some(({ data, pagination }) => pagination.total > data.length),
  };
}

/** Refuses an end with no price after it, since reservations of that subtype would then fail. */
export async function assertPriceAfter(price: TPriceScope, end: string | null, except?: number) {
  if (end) checkPriceAfter((await pricesAround(price)).lists, end, except);
}

export async function assertPriceEdit(price: TPrice, next: TPriceBody) {
  const { later, endMoved } = editMoves(price, next);
  if (later || endMoved) checkPriceEdit(await pricesAround(price), price, next);
}

const partlyDone = (message: string) =>
  new ApiError(message, { code: AccountingErrorCode.PartlyDone });

/** Adds `next` and ends `price` when it starts, once the new one is listed. */
export async function replacePrice(price: TPrice, next: TPriceBody) {
  if (Date.parse(next.valid_from) < Date.now() + 60_000) {
    throw new ApiError(
      'The new price would start within a minute. Pick a later start, so this one can still end then.',
      { status: 400 }
    );
  }
  if (price.valid_to && Date.parse(next.valid_from) > Date.parse(price.valid_to)) {
    throw new ApiError(
      `This price ends ${formatDateTime(price.valid_to)}. Start the new one by then, or add it as a new price.`,
      { status: 400 }
    );
  }
  await assertPriceAfter(next, next.valid_to, price.id);
  const created = await createPrice(next);
  if (!created) throw new ApiError(UNKNOWN_OUTCOME, { code: AccountingErrorCode.OutcomeUnknown });
  const listed = await listPricesFor(price).catch(() => null);
  if (!listed?.data.some((row) => row.id === created.id)) {
    throw partlyDone(
      `Price #${created.id} was added but isn't listed yet, so this one wasn't ended. Reload, then end this price when the new one starts.`
    );
  }
  await expirePrice(price.id, { valid_to: created.valid_from }).catch((error) => {
    throw partlyDone(
      isOutcomeUnknown(error)
        ? `Price #${created.id} was added, but no reply came about ending this one. Reload and check whether it ends when the new one starts before ending it again.`
        : `Price #${created.id} was added, but this one couldn't be ended: ${errorReason(error).replace(/\.$/, '')}. The new one applies from its start anyway, as it started last.`
    );
  });
  return created;
}
