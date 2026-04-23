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
  timestampGroupLabel: string;
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
}

export const LogLevelDict = {
  Info: 'info',
  Error: 'error',
} as const;

export type TLogLevel = (typeof LogLevelDict)[keyof typeof LogLevelDict];
