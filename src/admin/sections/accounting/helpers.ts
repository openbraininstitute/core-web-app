import { match, P } from 'ts-pattern';

import { ApiError } from '@/api/error';
import { formatBytes, formatDurationFromSeconds } from '@/utils/format';

import { ADMIN_ROOT } from '../../routes';
import { parseDay } from '../../shared/day';
import { Amount } from './schemas';
import {
  AccountingErrorCode,
  AccountingFilter,
  AccountingPage,
  AccountType,
  ChargeType,
  JobPhase,
  TransactionType,
} from './types';

import type { FormModalField } from '../../shared/form-modal';
import type { TStatusTone } from '../../shared/status-pill';
import type {
  TAccount,
  TAccountingFilter,
  TAccountingJob,
  TAccountingPage,
  TAccountStatus,
  TAccountType,
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
