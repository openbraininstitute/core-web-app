import dayjs from 'dayjs';
import { match, P } from 'ts-pattern';

import { ApiError } from '@/api/error';
import { formatBytes, formatDurationFromSeconds } from '@/utils/format';

import { ADMIN_ROOT } from '../../routes';
import { changedFields } from '../../shared/changed-fields';
import { parseDay } from '../../shared/day';
import { afterDate, REQUIRED } from '../../shared/form-modal';
import { formatDateTime } from '../../shared/format';
import { Amount, Fraction } from './schemas';
import {
  AccountingErrorCode,
  AccountingFilter,
  AccountingPage,
  AccountType,
  ChargeType,
  DiscountStatus,
  JobPhase,
  TransactionType,
} from './types';

import type { Rule } from 'antd/es/form';
import type { FormModalField } from '../../shared/form-modal';
import type { TStatusTone } from '../../shared/status-pill';
import type {
  TAccount,
  TAccountingFilter,
  TAccountingJob,
  TAccountingPage,
  TAccountStatus,
  TAccountType,
  TDiscount,
  TDiscountPatchBody,
  TDiscountStatus,
  TDiscountValues,
  TJobPhase,
  TJobReport,
  TLedgerEntry,
  TTransactionType,
} from './types';

export function accountingHref(
  page: TAccountingPage,
  params?: Partial<Record<TAccountingFilter, string>>
) {
  const query = new URLSearchParams(params).toString();
  return `${ADMIN_ROOT}/accounting/${page}${query ? `?${query}` : ''}`;
}

/** Local days as accounting's bounds: `after` is inclusive, `before` exclusive. */
export function dayBounds(from: string, to: string) {
  return {
    after: parseDay(from)?.startOf('day').toISOString(),
    before: parseDay(to)?.add(1, 'day').startOf('day').toISOString(),
  };
}

export const JOB_PHASES: Record<TJobPhase, { label: string; tone: TStatusTone }> = {
  [JobPhase.Created]: { label: 'Created', tone: 'neutral' },
  [JobPhase.Reserved]: { label: 'Reserved', tone: 'neutral' },
  [JobPhase.Running]: { label: 'Running', tone: 'warn' },
  [JobPhase.Finished]: { label: 'Finished', tone: 'good' },
  [JobPhase.Expired]: { label: 'Expired', tone: 'warn' },
  [JobPhase.Cancelled]: { label: 'Cancelled', tone: 'neutral' },
};

export const jobPhase = (job: TAccountingJob): TJobPhase =>
  match(job)
    .with({ cancelled_at: P.string, finished_at: P.string }, () => JobPhase.Expired)
    .with({ cancelled_at: P.string }, () => JobPhase.Cancelled)
    .with({ finished_at: P.string }, () => JobPhase.Finished)
    .with({ started_at: P.string }, () => JobPhase.Running)
    .with({ reserved_at: P.string }, () => JobPhase.Reserved)
    .otherwise(() => JobPhase.Created);

export const ACCOUNT_TYPE_LABELS: Record<TAccountType, string> = {
  [AccountType.System]: 'System',
  [AccountType.VirtualLab]: 'Virtual lab',
  [AccountType.Project]: 'Project',
  [AccountType.Reservation]: 'Reservation',
};

export const TRANSACTION_LABELS: Record<TTransactionType, string> = {
  [TransactionType.TopUp]: 'Top-up',
  [TransactionType.AssignBudget]: 'Assign budget',
  [TransactionType.ReverseBudget]: 'Reverse budget',
  [TransactionType.MoveBudget]: 'Move budget',
  [TransactionType.Reserve]: 'Reserve',
  [TransactionType.Release]: 'Release',
  [TransactionType.ChargeOneshot]: 'Charge (one-shot)',
  [TransactionType.ChargeLongrun]: 'Charge (long-running)',
  [TransactionType.ChargeStorage]: 'Charge (storage)',
  [TransactionType.OverchargeRefund]: 'Overcharge refund',
  [TransactionType.ManualRefund]: 'Manual refund',
  [TransactionType.Deplete]: 'Deplete',
};

/** Debited ledgers carry a negative amount. */
export function splitLedgers(ledgers: TLedgerEntry[]) {
  const debited = ledgers.filter((ledger) => ledger.amount.startsWith('-'));
  const credited = ledgers.filter((ledger) => !ledger.amount.startsWith('-'));
  return { debited, credited };
}

const SCOPE_FILTERS: Partial<Record<TAccountType, TAccountingFilter>> = {
  [AccountType.VirtualLab]: AccountingFilter.Vlab,
  [AccountType.Project]: AccountingFilter.Project,
};

export function accountLinks({ id, account_type: type }: TAccount) {
  const journal = {
    label: 'Journal',
    href: accountingHref(AccountingPage.Journal, { [AccountingFilter.Account]: id }),
  };
  const scope = SCOPE_FILTERS[type];
  if (!scope) return [journal];
  return [
    { label: 'Jobs', href: accountingHref(AccountingPage.Jobs, { [scope]: id }) },
    journal,
    { label: 'Report', href: accountingHref(AccountingPage.Reports, { [scope]: id }) },
    ...(type === AccountType.VirtualLab
      ? [
          {
            label: 'Discounts',
            href: accountingHref(AccountingPage.Discounts, { [AccountingFilter.Vlab]: id }),
          },
        ]
      : []),
  ];
}

/** An amount of credits, held as a string and checked as the proxy will. */
export const amountField = ({
  optional = false,
  extra,
}: {
  optional?: boolean;
  extra?: string;
} = {}): FormModalField => ({
  name: 'amount',
  label: 'Amount',
  kind: 'amount',
  placeholder: '0.00',
  extra,
  rules: [
    { required: !optional, message: 'Required' },
    {
      validator: async (_, value?: string | null) => {
        if (value == null || value === '') return;
        const parsed = Amount.safeParse(value);
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      },
    },
  ],
});

export const isOutcomeUnknown = (error: unknown) =>
  error instanceof ApiError && error.cause?.code === AccountingErrorCode.OutcomeUnknown;

const STATUS_ACCOUNT_TYPES: TAccountType[] = [AccountType.VirtualLab, AccountType.Project];

export function describeStatusChange({ accounts, open_job_ids: openJobs }: TAccountStatus) {
  const shown = accounts.filter((account) => STATUS_ACCOUNT_TYPES.includes(account.account_type));
  const [first] = shown;
  const changed = `${first?.enabled ? 'Enabled' : 'Disabled'} ${shown.length} ${shown.length === 1 ? 'account' : 'accounts'}`;
  if (!openJobs.length || first?.enabled) return changed;
  return `${changed}. ${openJobs.length} open ${openJobs.length === 1 ? 'job' : 'jobs'} can't be charged until it's enabled again.`;
}

export const reportUsage = (report: TJobReport) =>
  match(report)
    .with({ type: ChargeType.Oneshot }, ({ count }) => `${count} units`)
    .with({ type: ChargeType.Longrun }, ({ duration }) => formatDurationFromSeconds(duration))
    .with(
      { type: ChargeType.Storage },
      ({ size, duration }) => `${formatBytes(size)} for ${formatDurationFromSeconds(duration)}`
    )
    .otherwise(() => '');

function trimDecimal(whole: string, fraction: string) {
  const integer = whole.replace(/^0+(?=\d)/, '') || '0';
  const decimals = fraction.replace(/0+$/, '');
  return decimals ? `${integer}.${decimals}` : integer;
}

/** Moves the decimal point of a non-negative decimal string, right for positive `places`. */
export function shiftDecimal(value: string, places: number) {
  const [whole, fraction = ''] = value.split('.');
  const digits = whole + fraction;
  const point = whole.length + places;
  const padded = point < 0 ? '0'.repeat(-point) + digits : digits.padEnd(point, '0');
  const at = Math.max(point, 0);
  return trimDecimal(padded.slice(0, at), padded.slice(at));
}

const EXPONENT = /^(\d+(?:\.\d*)?)[eE]([+-]?\d+)$/;

/** Accounting writes small decimals as `1E-7`; this is `0.0000001`. */
export function plainDecimal(value: string) {
  const exponent = EXPONENT.exec(value);
  return exponent ? shiftDecimal(exponent[1], Number(exponent[2])) : shiftDecimal(value, 0);
}

export const fractionToPercent = (fraction: string) => shiftDecimal(plainDecimal(fraction), 2);

export const percentToFraction = (percent: string) => shiftDecimal(percent, -2);

export const discountStatus = ({ valid_from: from, valid_to: to }: TDiscount, now = new Date()) =>
  match({ from: new Date(from), to: to ? new Date(to) : null })
    .when(
      ({ to: end }) => end !== null && end <= now,
      () => DiscountStatus.Expired
    )
    .when(
      ({ from: start }) => start > now,
      () => DiscountStatus.Scheduled
    )
    .otherwise(() => DiscountStatus.Active);

export const DISCOUNT_STATUSES: Record<TDiscountStatus, { label: string; tone: TStatusTone }> = {
  [DiscountStatus.Scheduled]: { label: 'Scheduled', tone: 'neutral' },
  [DiscountStatus.Active]: { label: 'Active', tone: 'good' },
  [DiscountStatus.Expired]: { label: 'Expired', tone: 'neutral' },
};

export const percentField = (stored?: string): FormModalField => ({
  name: 'percent',
  label: 'Discount (%)',
  kind: 'amount',
  placeholder: '20',
  rules: [
    REQUIRED,
    {
      validator: async (_, value?: string | null) => {
        if (value == null || value === '' || value === stored) return;
        if (!Fraction.safeParse(percentToFraction(value)).success) {
          throw new Error('Use a percent from 0 to 100, with at most 4 decimals');
        }
      },
    },
  ],
});

const notPast = (stored?: string): Rule => ({
  validator: async (_, value?: string) => {
    if (value && value !== stored && dayjs(value).isBefore(dayjs().subtract(1, 'minute'))) {
      throw new Error("Can't be in the past");
    }
  },
});

export const startField = (required: boolean, stored?: string): FormModalField => ({
  name: 'valid_from',
  label: 'Starts',
  kind: 'datetime',
  extra: required ? undefined : 'Empty starts it now.',
  rules: [...(required ? [REQUIRED] : []), notPast(stored)],
});

const inFuture: Rule = {
  validator: async (_, value?: string) => {
    if (value && !dayjs(value).isAfter(dayjs())) throw new Error('Has to be in the future');
  },
};

/** `start` is the stored start, when the form has no start field. */
export function endField(start?: string): FormModalField {
  return {
    name: 'valid_to',
    label: 'Ends',
    kind: 'datetime',
    extra: 'Empty never ends.',
    ...(!start && { dependencies: ['valid_from'] }),
    rules: [
      inFuture,
      start
        ? afterDate(start, 'start')
        : ({ getFieldValue }) => afterDate(getFieldValue('valid_from'), 'start'),
    ],
  };
}

export const discountSummary = (discount: TDiscount) =>
  `${fractionToPercent(discount.discount)}% from ${formatDateTime(discount.valid_from)}${
    discount.valid_to ? ` to ${formatDateTime(discount.valid_to)}` : ', no end'
  }`;

export function discountUpdate(
  discount: TDiscount,
  values: Partial<TDiscountValues>
): TDiscountPatchBody {
  const next = {
    ...(values.percent !== undefined && { discount: percentToFraction(values.percent) }),
    ...(values.valid_from !== undefined && { valid_from: values.valid_from }),
    valid_to: values.valid_to ?? null,
  };
  return changedFields(next, {
    discount: plainDecimal(discount.discount),
    valid_from: discount.valid_from,
    valid_to: discount.valid_to,
  });
}
