import type { IJobRead, TJobStatus } from '@/features/task-logs-stream/types';

// launch-system's JobInternalRead: the job a user reads, plus its virtual lab.
export type LaunchSystemJob = IJobRead & {
  virtual_lab_id: string;
  creation_date: string;
  update_date: string;
  status: TJobStatus;
  meta: { type?: string } | null;
};

export type JobLookup =
  | { outcome: 'found'; job: LaunchSystemJob }
  | { outcome: 'invalid-id' }
  | { outcome: 'not-found' }
  | { outcome: 'denied' }
  | { outcome: 'no-answer' }
  | { outcome: 'not-reachable'; status: number }
  | { outcome: 'failed'; status: number; message: string | null };
