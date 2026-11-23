import { StatusPill } from '../../../shared/status-pill';
import { JOB_PHASES, jobPhase } from '../helpers';

import type { TAccountingJob } from '../types';

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
