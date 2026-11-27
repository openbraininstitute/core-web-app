import { StatusPill } from '../../../shared/status-pill';
import { JOB_PHASES, jobPhase, WINDOW_STATUSES, windowStatus } from '../helpers';

import type { TAccountingJob, TValidity } from '../types';

export function Credits({ amount }: { amount: string | null | undefined }) {
  return <span className="font-mono tabular-nums">{amount ?? '—'}</span>;
}

export function EnabledPill({ enabled }: { enabled: boolean }) {
  return enabled ? null : <StatusPill tone="bad">Disabled</StatusPill>;
}

export function JobPhasePill({ job }: { job: TAccountingJob }) {
  const { label, tone } = JOB_PHASES[jobPhase(job)];
  return <StatusPill tone={tone}>{label}</StatusPill>;
}

export function WindowStatusPill({ window }: { window: TValidity }) {
  const { label, tone } = WINDOW_STATUSES[windowStatus(window)];
  return <StatusPill tone={tone}>{label}</StatusPill>;
}
