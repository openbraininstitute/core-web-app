import type { ReactNode } from 'react';
import type * as z from 'zod';
import type { ZodType } from 'zod';
import type { FormModalField } from '../../shared/form-modal';
import type {
  AccountStatusBody,
  AssignBody,
  DepleteProjectBody,
  DepleteVlabBody,
  GrantBody,
  MoveBody,
  RefundBody,
  ReverseBody,
  TopUpBody,
} from './schemas';

export const AccountType = {
  System: 'sys',
  VirtualLab: 'vlab',
  Project: 'proj',
  Reservation: 'rsv',
} as const;
export type TAccountType = (typeof AccountType)[keyof typeof AccountType];

export const TransactionType = {
  TopUp: 'top-up',
  AssignBudget: 'assign-budget',
  ReverseBudget: 'reverse-budget',
  MoveBudget: 'move-budget',
  Reserve: 'reserve',
  Release: 'release',
  ChargeOneshot: 'charge-oneshot',
  ChargeLongrun: 'charge-longrun',
  ChargeStorage: 'charge-storage',
  OverchargeRefund: 'overcharge-refund',
  ManualRefund: 'manual-refund',
  Deplete: 'deplete',
} as const;
export type TTransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const ChargeType = { Oneshot: 'oneshot', Longrun: 'longrun', Storage: 'storage' } as const;
export type TChargeType = (typeof ChargeType)[keyof typeof ChargeType];

/** accounting-service `AdminJobStatus`, the job list's status filter. */
export const JobStatusFilter = {
  Open: 'open',
  Finished: 'finished',
  Cancelled: 'cancelled',
} as const;
export type TJobStatusFilter = (typeof JobStatusFilter)[keyof typeof JobStatusFilter];

/** accounting-service `ServiceSubtype`; main's enum lags it, and a stale value gets a 422. */
export const AccountingSubtype = {
  IonChannelBuild: 'ion-channel-build',
  IonChannelSim: 'ion-channel-sim',
  MlLlm: 'ml-llm',
  Mcp: 'mcp',
  ResearchAgent: 'research-agent',
  NeuronMeshSkeletonization: 'neuron-mesh-skeletonization',
  Notebook: 'notebook',
  SingleCellBuild: 'single-cell-build',
  SingleCellSim: 'single-cell-sim',
  SmallCircuitSim: 'small-circuit-sim',
  Storage: 'storage',
  SynaptomeBuild: 'synaptome-build',
  SynaptomeSim: 'synaptome-sim',
  SingleSim: 'single-sim',
  PairSim: 'pair-sim',
  SmallSim: 'small-sim',
  MicrocircuitSim: 'microcircuit-sim',
  RegionSim: 'region-sim',
  SystemSim: 'system-sim',
  WholeBrainSim: 'whole-brain-sim',
  CircuitExtraction: 'circuit-extraction',
  CircuitSimplificationSmall: 'circuit-simplification-small',
  CircuitSimplificationMedium: 'circuit-simplification-medium',
  CircuitSimplificationLarge: 'circuit-simplification-large',
  EmSynapseMapping: 'em-synapse-mapping',
  Brian2CircuitSimulation: 'brian2-circuit-simulation',
  NestCircuitSimulation: 'nest-circuit-simulation',
  EModelFeaturesExtraction: 'emodel-features-extraction',
  EModelOptimisation: 'emodel-optimisation',
  EModelValidation: 'emodel-validation',
  SynapseParameterizationSmall: 'synapse-parameterization-small',
  SynapseParameterizationLarge: 'synapse-parameterization-large',
  ExtracellularRecordingArrayBuild: 'extracellular-recording-array-build',
  MlRag: 'ml-rag',
  MlRetrieval: 'ml-retrieval',
} as const;
export type TAccountingSubtype = (typeof AccountingSubtype)[keyof typeof AccountingSubtype];

export type TPaginated<Row> = {
  items: Row[];
  meta: { page: number; page_size: number; total_pages: number; total_items: number };
};

export type TPageParams = { page: number; page_size: number };

export type TParams = Record<string, string | number | boolean | undefined>;

export type TVlabAccount = {
  id: string;
  name: string;
  balance: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type TProjectAccount = TVlabAccount & { vlab_id: string; reservation: string };

export type TAccount = TVlabAccount & { account_type: TAccountType; parent_id: string | null };

export type TLedgerEntry = {
  id: number;
  account_id: string;
  account_name: string;
  account_type: TAccountType;
  amount: string;
};

export type TJournalEntry = {
  id: number;
  transaction_datetime: string;
  transaction_type: TTransactionType;
  job_id: string | null;
  price_id: number | null;
  discount_id: number | null;
  properties: Record<string, unknown> | null;
  ledgers: TLedgerEntry[];
};

export type TAccountingJob = {
  id: string;
  group_id: string | null;
  vlab_id: string;
  proj_id: string;
  name: string | null;
  user_id: string | null;
  service_type: TChargeType;
  service_subtype: TAccountingSubtype;
  created_at: string;
  updated_at: string;
  reserved_at: string | null;
  started_at: string | null;
  last_alive_at: string | null;
  last_charged_at: string | null;
  finished_at: string | null;
  cancelled_at: string | null;
  reservation_params: Record<string, unknown>;
  usage_params: Record<string, unknown>;
};

export type TAccountingJobDetail = TAccountingJob & {
  journal: TJournalEntry[];
  total_charged: string;
  total_refunded: string;
  remaining_reservation: string;
};

type TReportBase = {
  job_id: string;
  vlab_id?: string;
  proj_id?: string;
  subtype: TAccountingSubtype;
  started_at: string;
  amount: string;
};

export type TJobReport =
  | (TReportBase & {
      type: typeof ChargeType.Oneshot;
      user_id: string;
      name?: string;
      count: number;
      reserved_amount: string;
    })
  | (TReportBase & {
      type: typeof ChargeType.Longrun;
      user_id: string;
      name?: string;
      finished_at: string;
      duration: number;
      reserved_amount: string;
    })
  | (TReportBase & {
      type: typeof ChargeType.Storage;
      finished_at: string;
      duration: number;
      size: number;
    });

export type TVlabAccountFilters = { name?: string; enabled?: boolean };

export type TJobFilters = {
  vlab_id?: string;
  proj_id?: string;
  service_type?: TChargeType;
  service_subtype?: TAccountingSubtype;
  status?: TJobStatusFilter;
  started_after?: string;
  started_before?: string;
};

export type TJournalFilters = {
  account_id?: string;
  job_id?: string;
  transaction_type?: TTransactionType;
  transaction_after?: string;
  transaction_before?: string;
};

export type TReportFilters = { started_after?: string; started_before?: string };

export const AccountingPage = {
  Accounts: 'accounts',
  Jobs: 'jobs',
  Journal: 'journal',
  Reports: 'reports',
} as const;
export type TAccountingPage = (typeof AccountingPage)[keyof typeof AccountingPage];

export const JobPhase = {
  Created: 'created',
  Reserved: 'reserved',
  Running: 'running',
  Finished: 'finished',
  Expired: 'expired',
  Cancelled: 'cancelled',
} as const;
export type TJobPhase = (typeof JobPhase)[keyof typeof JobPhase];

export const AccountingFilter = {
  Account: 'account',
  Vlab: 'vlab',
  Project: 'project',
  Job: 'job',
} as const;
export type TAccountingFilter = (typeof AccountingFilter)[keyof typeof AccountingFilter];

export const EnabledFilter = { Any: 'any', Enabled: 'enabled', Disabled: 'disabled' } as const;
export type TEnabledFilter = (typeof EnabledFilter)[keyof typeof EnabledFilter];

export const AccountingMethod = { Get: 'GET', Post: 'POST', Patch: 'PATCH' } as const;
export type TAccountingMethod = (typeof AccountingMethod)[keyof typeof AccountingMethod];

export type TAccountingRoute = {
  method: TAccountingMethod;
  pattern: RegExp;
  query: string[];
  body?: ZodType;
};

export const AuditPhase = { Sent: 'sent', Answered: 'answered', Refused: 'refused' } as const;

export const AccountingErrorCode = { OutcomeUnknown: 'OUTCOME_UNKNOWN' } as const;

/** What came back from accounting when there's no status to log. */
export const UpstreamOutcome = {
  NotSent: 'not sent',
  Timeout: 'timeout',
  NoReply: 'no reply',
} as const;
export type TUpstreamOutcome = (typeof UpstreamOutcome)[keyof typeof UpstreamOutcome];

export type TAccountingWrite = { method: TAccountingMethod; body: string };

export type TAccountingTarget =
  | { path: string; search: URLSearchParams; body?: ZodType }
  | { status: number; message: string };

export type TTopUpBody = z.infer<typeof TopUpBody>;
export type TAssignBody = z.infer<typeof AssignBody>;
export type TReverseBody = z.infer<typeof ReverseBody>;
export type TMoveBody = z.infer<typeof MoveBody>;
export type TGrantBody = z.infer<typeof GrantBody>;
export type TDepleteProjectBody = z.infer<typeof DepleteProjectBody>;
export type TDepleteVlabBody = z.infer<typeof DepleteVlabBody>;
export type TAccountStatusBody = z.infer<typeof AccountStatusBody>;
export type TRefundBody = z.infer<typeof RefundBody>;

export type TAccountStatus = { accounts: TAccount[]; open_job_ids: string[] };
export type TDepleted = { total_amount: string };
export type TRefund = {
  journal_id: number;
  job_id: string;
  vlab_id: string;
  proj_id: string;
  amount: string;
};

export type TAccountActionValues = { amount: string; credited_to: string; name: string };
export type TRefundValues = { amount?: string | null; reason: string };

/** A write behind a button and a form dialog; `done` is the message once it's through. */
export type TAction<Values, Result = null> = {
  label: string;
  title: string;
  description: ReactNode;
  fields?: FormModalField[];
  okText: string;
  danger?: boolean;
  buttonVariant?: 'outline' | 'destructive';
  write: (values: Values) => Promise<Result>;
  done: string | ((result: Result) => string);
  failed: string;
};
