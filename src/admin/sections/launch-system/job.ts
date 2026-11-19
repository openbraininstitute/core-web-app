// launch-system services/api/app/db/types.py
export const JobStatus = {
  Created: 'created',
  Pending: 'pending',
  Running: 'running',
  Done: 'done',
  Error: 'error',
  Cancelled: 'cancelled',
} as const;

export type TJobStatus = (typeof JobStatus)[keyof typeof JobStatus];

type Tagged = { type: string } & Record<string, unknown>;

// services/api/app/schemas/job.py, JobInternalRead
export type LaunchSystemJob = {
  id: string;
  creation_date: string;
  update_date: string;
  virtual_lab_id: string;
  project_id: string;
  user_id: string;
  status: TJobStatus;
  error_reason: string | null;
  start_time: string | null;
  end_time: string | null;
  logs: Record<string, unknown> | null;
  inputs: string[];
  code: Tagged;
  resources: Tagged;
  meta: Tagged | null;
};

export type JobLookup =
  | { outcome: 'found'; job: LaunchSystemJob }
  | { outcome: 'invalid-id' }
  | { outcome: 'not-found' }
  | { outcome: 'denied' }
  | { outcome: 'not-reachable'; status?: number }
  | { outcome: 'failed'; status: number; message: string | null };
