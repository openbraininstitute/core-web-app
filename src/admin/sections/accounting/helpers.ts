import dayjs from 'dayjs';

import { ADMIN_ROOT } from '../../routes';
import { AccountType, JobPhase, TransactionType } from './types';

import type { TStatusTone } from '../../shared/status-pill';
import type {
  TAccountingJob,
  TAccountingPage,
  TAccountType,
  TJobPhase,
  TLedgerEntry,
  TTransactionType,
} from './types';

export function accountingHref(page: TAccountingPage, params?: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `${ADMIN_ROOT}/accounting/${page}${search.size ? `?${search}` : ''}`;
}

export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const DAY_FORMAT = 'YYYY-MM-DD';

export function parseDay(value: string) {
  const day = dayjs(value);
  return value && day.isValid() && day.format(DAY_FORMAT) === value ? day : null;
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
  [JobPhase.Cancelled]: { label: 'Cancelled', tone: 'neutral' },
};

export function jobPhase(job: TAccountingJob): TJobPhase {
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

export function formatDuration(duration: number) {
  const seconds = Math.round(duration);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours) return `${hours} h ${minutes} min`;
  if (minutes) return `${minutes} min ${rest} s`;
  return `${rest} s`;
}
