export interface IRawStreamLog {
  message_type?: string;
  timestamp?: string;
  message?: string;
  status?: string;
  stdout?: string;
  stderr?: string;
}

export const LogTypeDict = {
  Stderr: {
    key: 'stderr',
    label: 'STDERR',
    badgeClass: 'bg-teal-600 text-white border-transparent',
  },
  Error: {
    key: 'error',
    label: 'ERROR',
    badgeClass: 'bg-red-600 text-white border-transparent',
  },
  Stdout: {
    key: 'stdout',
    label: 'STDOUT',
    badgeClass: 'bg-emerald-600 text-white border-transparent',
  },
  Status: {
    key: 'status',
    label: 'STATUS',
    badgeClass: 'bg-blue-600 text-white border-transparent',
  },
  Info: {
    key: 'info',
    label: 'INFO',
    badgeClass: 'bg-cyan-600 text-white border-transparent',
  },
  Warning: {
    key: 'warning',
    label: 'WARNING',
    badgeClass: 'bg-amber-500 text-white border-transparent',
  },
  Warn: {
    key: 'warn',
    label: 'WARN',
    badgeClass: 'bg-amber-500 text-white border-transparent',
  },
  Log: {
    key: 'log',
    label: 'LOG',
    badgeClass: 'bg-neutral-200 text-neutral-900 border-neutral-300',
  },
  Raw: {
    key: 'raw',
    label: 'RAW',
    badgeClass: 'bg-neutral-200 text-neutral-900 border-neutral-300',
  },
} as const;

export type TLogTypeKey = (typeof LogTypeDict)[keyof typeof LogTypeDict]['key'];

export interface ILogEntry {
  id: string;
  type: TLogTypeKey;
  timestamp?: string;
  message: string;
  timestampGroupLabel: string | null;
}

export interface IHighlightRange {
  start: number;
  end: number;
}

export interface ISearchResult {
  entries: ILogEntry[];
  highlightById: Map<string, IHighlightRange[]>;
}

export interface IMatchLocation {
  entryId: string;
  start: number;
  end: number;
  matchId: string;
}

export interface ITaskLogsStreamState {
  entries: ILogEntry[];
  streamError: string | null;
  isLoading: boolean;
  isStreaming: boolean;
}

export const LogLevelDict = {
  Info: 'info',
  Error: 'error',
} as const;

export type TLogLevel = (typeof LogLevelDict)[keyof typeof LogLevelDict];

export const JobErrorReasonDict = {
  StartFailure: 'start_failure',
  ExecutorFailure: 'executor_failure',
  StopFailure: 'stop_failure',
  Timeout: 'timeout',
} as const;

export type TJobErrorReason = (typeof JobErrorReasonDict)[keyof typeof JobErrorReasonDict];

export const JobStatusDict = {
  Created: 'created',
  Pending: 'pending',
  Running: 'running',
  Done: 'done',
  Error: 'error',
  Cancelled: 'cancelled',
} as const;

export type TJobStatus = (typeof JobStatusDict)[keyof typeof JobStatusDict];

export interface IJobCode {
  type: string;
  location?: string;
  ref?: string;
  path?: string;
  dependencies?: string;
  staged_directories?: string[];
  capabilities?: {
    private_packages?: boolean;
    env_secrets?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface IJobResources {
  type?: string;
  cores?: number;
  memory?: number;
  timelimit?: number;
  compute_cell?: string;
  [key: string]: unknown;
}

export interface IJobRead {
  id: string;
  creation_date?: string;
  update_date?: string;
  project_id: string;
  user_id: string;
  status: TJobStatus | string;
  error_reason: TJobErrorReason | string | null;
  start_time: string | null;
  end_time: string | null;
  logs: { stream: Record<string, unknown> | null } | null;
  inputs: string[];
  code: IJobCode;
  resources: IJobResources;
  meta: Record<string, unknown> | null;
  [key: string]: unknown;
}

export const ViewerTabDict = {
  Configuration: 'configuration',
  Logs: 'logs',
} as const;

export type TViewerTab = (typeof ViewerTabDict)[keyof typeof ViewerTabDict];

export interface ITaskLogsDataState extends ITaskLogsStreamState {
  configuration: Omit<IJobRead, 'logs'> | null;
}

export type TLogsExportFormat = 'txt' | 'json';
