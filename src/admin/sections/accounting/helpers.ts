import { match } from 'ts-pattern';

import { formatBytes, formatDurationFromSeconds } from '@/utils/format';

import { ADMIN_ROOT } from '../../routes';
import { parseDay } from '../../shared/day';
import {
  AccountingFilter,
  AccountingPage,
  AccountType,
  ChargeType,
  JobPhase,
  TransactionType,
} from './types';

import type { TStatusTone } from '../../shared/status-pill';
import type {
  TAccount,
  TAccountingFilter,
  TAccountingJob,
  TAccountingPage,
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

export function jobPhase(job: TAccountingJob): TJobPhase {
  if (job.cancelled_at && job.finished_at) return JobPhase.Expired;
  if (job.cancelled_at) return JobPhase.Cancelled;
  if (job.finished_at) return JobPhase.Finished;
  if (job.started_at) return JobPhase.Running;
  if (job.reserved_at) return JobPhase.Reserved;
  return JobPhase.Created;
}

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

export const reportUsage = (report: TJobReport) =>
  match(report)
    .with({ type: ChargeType.Oneshot }, ({ count }) => `${count} units`)
    .with({ type: ChargeType.Longrun }, ({ duration }) => formatDurationFromSeconds(duration))
    .with(
      { type: ChargeType.Storage },
      ({ size, duration }) => `${formatBytes(size)} for ${formatDurationFromSeconds(duration)}`
    )
    .otherwise(() => '');
