import type { IJobRead, TJobStatus } from '@/features/task-logs-stream/types';

/** launch-system's JobInternalRead: a job plus its virtual lab. */
export type TLaunchSystemJob = IJobRead & {
  virtual_lab_id: string;
  creation_date: string;
  update_date: string;
  status: TJobStatus;
  meta: { type?: string } | null;
};

export const JobOutcome = {
  Found: 'found',
  InvalidId: 'invalid-id',
  NotFound: 'not-found',
  Denied: 'denied',
  NoAnswer: 'no-answer',
  NotReachable: 'not-reachable',
  Failed: 'failed',
} as const;

export type TJobOutcome = (typeof JobOutcome)[keyof typeof JobOutcome];

export type TJobLookup =
  | { outcome: typeof JobOutcome.Found; job: TLaunchSystemJob }
  | { outcome: typeof JobOutcome.InvalidId }
  | { outcome: typeof JobOutcome.NotFound }
  | { outcome: typeof JobOutcome.Denied }
  | { outcome: typeof JobOutcome.NoAnswer }
  | { outcome: typeof JobOutcome.NotReachable; status: number }
  | { outcome: typeof JobOutcome.Failed; status: number; message: string | null };
