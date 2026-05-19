'use client';

import { useCallback } from 'react';

import { Configuration } from '@/features/task-logs-stream/elements/configuration';
import { LogsViewer as LogEntriesViewer } from '@/features/task-logs-stream/elements/logger';
import { useTaskLogsData } from '@/features/task-logs-stream/hooks/use-task-logs';
import { log } from '@/utils/logger';

import type { ReactNode } from 'react';
import type { TScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import type { TLogLevel } from '@/features/task-logs-stream/types';
import type { WorkspaceContext } from '@/types/common';

interface ITaskLogsViewerProps {
  jobId?: string;
  workspace: WorkspaceContext;
  configId?: string;
  enabled: boolean;
  enableDebugLogs?: boolean;
  /** when true, skip the stream and read the job directly (e.g. terminal execution status) */
  skipStream?: boolean;
  campaignOriginAction: TScanConfigCampaignOriginActionDict;
  isCampaignIdChanged: boolean;
}

function TaskViewerFrame({ children }: { children: ReactNode }) {
  return (
    <div
      id="job-viewer"
      className="flex h-full min-h-0 flex-col overflow-hidden bg-neutral-50 px-4 w-full"
    >
      {children}
    </div>
  );
}

function useTaskViewerData({
  jobId,
  workspace,
  configId,
  enabled,
  enableDebugLogs = false,
  skipStream = false,
}: ITaskLogsViewerProps) {
  const debugLog = useCallback(
    ({ level, message, payload }: { level: TLogLevel; message: string; payload?: unknown }) => {
      if (!enableDebugLogs) return;
      log(level, message, payload);
    },
    [enableDebugLogs]
  );

  const taskLogsData = useTaskLogsData({
    jobId,
    workspace,
    configId,
    enabled,
    skipStream,
    debugLog,
  });

  return taskLogsData;
}

export function TaskLogsViewer(props: ITaskLogsViewerProps) {
  const { entries, streamError, isLoading } = useTaskViewerData(props);
  const { enabled, jobId } = props;

  if (!enabled) return null;

  return (
    <TaskViewerFrame>
      <LogEntriesViewer
        entries={entries}
        streamError={streamError}
        isLoading={isLoading}
        enabled={enabled}
        searchDisabled={!jobId}
      />
    </TaskViewerFrame>
  );
}

export function TaskConfigurationViewer(props: ITaskLogsViewerProps) {
  const { configuration } = useTaskViewerData(props);
  const { enabled } = props;

  if (!enabled) return null;

  return (
    <TaskViewerFrame>
      <div
        id="job-configuration-panel"
        className="secondary-scrollbar min-h-0 flex-1 overflow-y-auto pr-2"
      >
        <Configuration configuration={configuration} />
      </div>
    </TaskViewerFrame>
  );
}
