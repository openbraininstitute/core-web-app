import { dedupeLogEntries } from '../helpers';

import type { ILogEntry, ITaskLogsDataState } from '../types';

interface IResolveTaskLogsDataStateParams {
  enabled: boolean;
  jobId?: string;
  hasStreamTerminated: boolean;
  streamEntries: ILogEntry[];
  cachedStreamEntries: ILogEntry[];
  streamIsActive: boolean;
  streamIsLoading: boolean;
  readIsLoading: boolean;
  readEntries?: ILogEntry[];
  readHasTerminalStatus: boolean;
  streamErrorMessage: string | null;
  readErrorMessage: string | null;
  configuration: ITaskLogsDataState['configuration'];
}

export function resolveTaskLogsDataState({
  enabled,
  jobId,
  hasStreamTerminated,
  streamEntries,
  cachedStreamEntries,
  streamIsActive,
  streamIsLoading,
  readIsLoading,
  readEntries,
  readHasTerminalStatus,
  streamErrorMessage,
  readErrorMessage,
  configuration,
}: IResolveTaskLogsDataStateParams): ITaskLogsDataState {
  if (!enabled) {
    return {
      entries: [],
      streamError: null,
      isLoading: false,
      isStreaming: false,
      configuration: null,
    };
  }

  if (!jobId) {
    return {
      entries: [],
      streamError:
        'Logs will appear once the task starts, including live output, status updates, and execution details.',
      isLoading: false,
      isStreaming: false,
      configuration: null,
    };
  }

  const liveEntries = dedupeLogEntries({
    entries: streamEntries.length > 0 ? streamEntries : cachedStreamEntries,
  });
  const finalReadEntries = readEntries ? dedupeLogEntries({ entries: readEntries }) : undefined;

  if (!hasStreamTerminated) {
    return {
      entries: liveEntries,
      streamError: streamErrorMessage,
      isLoading: liveEntries.length === 0 && streamIsLoading && !streamIsActive,
      isStreaming: true,
      configuration,
    };
  }

  if (finalReadEntries && (finalReadEntries.length > 0 || readHasTerminalStatus)) {
    return {
      entries: finalReadEntries,
      streamError: null,
      isLoading: false,
      isStreaming: false,
      configuration,
    };
  }

  return {
    entries: liveEntries,
    streamError: readErrorMessage,
    isLoading: liveEntries.length === 0 && (readIsLoading || !readHasTerminalStatus),
    isStreaming: false,
    configuration,
  };
}
