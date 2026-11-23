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
  AccountingSubtype,
  AccountType,
  ChargeType,
  JobPhase,
  TransactionType,
  WindowStatus,
} from './types';

import type { Rule } from 'antd/es/form';
import type { ZodType } from 'zod';
import type { FormModalField } from '../../shared/form-modal';
import type { TStatusTone } from '../../shared/status-pill';
import type {
  TAccount,
  TAccountingFilter,
  TAccountingJob,
  TAccountingPage,
  TAccountStatus,
  TAccountType,
  TChargeType,
  TDiscount,
  TDiscountPatchBody,
  TDiscountValues,
  TJobPhase,
  TJobReport,
  TLedgerEntry,
  TPrice,
  TPriceBody,
  TPriceFilters,
  TPriceScope,
  TPriceTier,
  TPriceValues,
  TPricing,
  TTierValues,
  TTransactionType,
  TValidity,
  TWindowStatus,
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
            label: 'Prices',
            href: accountingHref(AccountingPage.Prices, { [AccountingFilter.Vlab]: id }),
          },
          {
            label: 'Discounts',
            href: accountingHref(AccountingPage.Discounts, { [AccountingFilter.Vlab]: id }),
          },
        ]
      : []),
  ];
}

/** Checks a filled-in value as the proxy's schema will. */
export const schemaRule = (schema: ZodType): Rule => ({
  validator: async (_, value?: string | null) => {
    if (value == null || value === '') return;
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  },
});

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
  rules: [{ required: !optional, message: 'Required' }, schemaRule(Amount)],
});

export const isOutcomeUnknown = (error: unknown) =>
  error instanceof ApiError && error.cause?.code === AccountingErrorCode.OutcomeUnknown;

/** After these, sending the same form again would repeat what went through. */
export const closesDialog = (error: unknown) =>
  isOutcomeUnknown(error) ||
  (error instanceof ApiError && error.cause?.code === AccountingErrorCode.PartlyDone);

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

export const windowStatus = ({ valid_from: from, valid_to: to }: TValidity, now = new Date()) =>
  match({ from: new Date(from), to: to ? new Date(to) : null })
    .when(
      ({ to: end }) => end !== null && end <= now,
      () => WindowStatus.Expired
    )
    .when(
      ({ from: start }) => start > now,
      () => WindowStatus.Scheduled
    )
    .otherwise(() => WindowStatus.Active);

export const isCurrent = (window: TValidity) => windowStatus(window) !== WindowStatus.Expired;

export const WINDOW_STATUSES: Record<TWindowStatus, { label: string; tone: TStatusTone }> = {
  [WindowStatus.Scheduled]: { label: 'Scheduled', tone: 'neutral' },
  [WindowStatus.Active]: { label: 'Active', tone: 'good' },
  [WindowStatus.Expired]: { label: 'Expired', tone: 'neutral' },
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
export function endField(start?: string, required = false): FormModalField {
  return {
    name: 'valid_to',
    label: 'Ends',
    kind: 'datetime',
    extra: required ? undefined : 'Empty never ends.',
    ...(!start && { dependencies: ['valid_from'] }),
    rules: [
      ...(required ? [REQUIRED] : []),
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

/** How far ahead a replacement price starts, so the old one can still end then. */
export const START_AHEAD_MS = 5 * 60_000;

export const SERVICE_TYPE_LABELS: Record<TChargeType, string> = {
  [ChargeType.Oneshot]: 'One-shot',
  [ChargeType.Longrun]: 'Long-running',
  [ChargeType.Storage]: 'Storage',
};

export const SERVICE_TYPE_OPTIONS = Object.values(ChargeType).map((value) => ({
  value,
  label: SERVICE_TYPE_LABELS[value],
}));

export const SUBTYPE_OPTIONS = Object.values(AccountingSubtype).map((value) => ({
  value,
  label: value,
}));

const tierValues = (tiers: TPriceTier[]): TTierValues[] =>
  tiers.map(({ max_quantity: max, fixed_cost: fixed, multiplier }) => ({
    to: max,
    fixed_cost: plainDecimal(fixed),
    multiplier: plainDecimal(multiplier),
  }));

function priceTiers(tiers: TTierValues[], serviceType: TChargeType): TPriceTier[] {
  const last = tiers.length - 1;
  return tiers.map((tier, index) => ({
    min_quantity: index === 0 ? 0 : (tiers[index - 1].to ?? 0),
    max_quantity: index === last ? null : (tier.to ?? null),
    fixed_cost: serviceType === ChargeType.Storage ? '0' : tier.fixed_cost || '0',
    multiplier: tier.multiplier || '0',
  }));
}

/** An empty start is now; `vlabId` null makes the default price. */
export const priceBody = (values: TPriceValues, vlabId: string | null): TPriceBody => ({
  service_type: values.service_type,
  service_subtype: values.service_subtype,
  valid_from: values.valid_from ?? new Date().toISOString(),
  valid_to: values.valid_to ?? null,
  vlab_id: vlabId,
  tiers: priceTiers(values.tiers, values.service_type),
});

export const priceValues = (price: TPrice): TPriceValues => ({
  service_type: price.service_type,
  service_subtype: price.service_subtype,
  valid_from: price.valid_from,
  valid_to: price.valid_to ?? undefined,
  tiers: tierValues(price.tiers),
});

const COST_SCALE = 30;

const tenTo = (power: number) => BigInt(`1${'0'.repeat(power)}`);

function scaled(value: string) {
  const [whole, fraction = ''] = plainDecimal(value).split('.');
  return BigInt(whole + fraction.slice(0, COST_SCALE).padEnd(COST_SCALE, '0'));
}

/** Accounting's tier rule, exact, rounded to cents. */
export function tierCost(tiers: TPriceTier[], quantity: bigint) {
  const total = tiers.reduce((sum, { min_quantity: min, max_quantity: max, ...tier }) => {
    const start = BigInt(min);
    if (quantity <= start) return sum;
    const end = max === null || BigInt(max) > quantity ? quantity : BigInt(max);
    return sum + scaled(tier.fixed_cost) + scaled(tier.multiplier) * (end - start);
  }, BigInt(0));
  const cents = (total + BigInt(5) * tenTo(COST_SCALE - 3)) / tenTo(COST_SCALE - 2);
  const hundred = BigInt(100);
  return `${cents / hundred}.${String(cents % hundred).padStart(2, '0')}`;
}

const HOUR = 3600;
const GIB_MONTH = BigInt(2 ** 30) * BigInt(30 * 24 * HOUR);

/** Usage to show a price's cost for, in accounting's units for each service type. */
export const COST_EXAMPLES: Record<TChargeType, Array<{ label: string; quantity: bigint }>> = {
  [ChargeType.Oneshot]: [1, 10, 100, 1000].map((count) => ({
    label: `${count} ${count === 1 ? 'unit' : 'units'}`,
    quantity: BigInt(count),
  })),
  [ChargeType.Longrun]: [
    { label: '1 hour on a small instance', quantity: BigInt(HOUR) },
    { label: '1 day on a small instance', quantity: BigInt(24 * HOUR) },
    { label: '1 hour on a full node', quantity: BigInt(4 * HOUR) },
  ],
  [ChargeType.Storage]: [
    { label: '1 GiB for 30 days', quantity: GIB_MONTH },
    { label: '100 GiB for 30 days', quantity: BigInt(100) * GIB_MONTH },
  ],
};

/** The tiers accounting charges by: storage takes only the first tier's rate. */
export const chargedTiers = ({ service_type: type, tiers }: TPricing): TPriceTier[] =>
  type === ChargeType.Storage && tiers.length
    ? [{ ...tiers[0], max_quantity: null, fixed_cost: '0' }]
    : tiers;

export function tierSummary(price: TPricing) {
  const tiers = chargedTiers(price);
  if (tiers.length !== 1) return tiers.length ? `${tiers.length} tiers` : '—';
  const [{ fixed_cost: fixed, multiplier }] = tiers;
  const unit = price.service_type === ChargeType.Storage ? 'byte-second' : 'unit';
  const rate = `${plainDecimal(multiplier)} per ${unit}`;
  return /[1-9]/.test(plainDecimal(fixed)) ? `${plainDecimal(fixed)} + ${rate}` : rate;
}

/** The list filters for prices on the same footing: this lab's, or the default. */
export const priceKey = ({
  service_type: type,
  service_subtype: subtype,
  vlab_id: vlabId,
}: TPriceScope): TPriceFilters => ({
  service_type: type,
  service_subtype: subtype,
  ...(vlabId ? { vlab_id: vlabId } : { only_default: true }),
});

/** The price accounting uses at `at`: lists come newest start first, which is its order. */
export const priceAt = (prices: TPrice[], at: Date, except?: number) =>
  prices.find(
    (price) =>
      price.id !== except &&
      new Date(price.valid_from) <= at &&
      (price.valid_to === null || new Date(price.valid_to) > at)
  );
