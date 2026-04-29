'use client';

import { useCallback, useState } from 'react';

import {
  ScanConfigCampaignOriginActionDict,
  type TScanConfigCampaignOriginActionDict,
} from '@/features/scan-config/helpers';
import { Configuration } from '@/features/task-logs-stream/elements/configuration';
import { LogsViewer } from '@/features/task-logs-stream/elements/logger';
import { useTaskLogsData } from '@/features/task-logs-stream/hooks/use-task-logs-data';
import { ViewerTabDict } from '@/features/task-logs-stream/types';
import { log } from '@/utils/logger';

import type { TLogLevel, TViewerTab } from '@/features/task-logs-stream/types';

interface IProps {
  jobId?: string;
  virtualLabId: string;
  projectId: string;
  configId?: string;
  enabled: boolean;
  enableDebugLogs?: boolean;
  campaignOriginAction: TScanConfigCampaignOriginActionDict;
  isCampaignIdChanged: boolean;
}

export function Viewer({
  jobId,
  virtualLabId,
  projectId,
  configId,
  enabled,
  enableDebugLogs = false,
  campaignOriginAction,
  isCampaignIdChanged,
}: IProps) {
  const isViewCampaign =
    campaignOriginAction === ScanConfigCampaignOriginActionDict.View && !isCampaignIdChanged;

  const [activeTab] = useState<TViewerTab>(ViewerTabDict.Logs);
  const debugLog = useCallback(
    ({ level, message, payload }: { level: TLogLevel; message: string; payload?: unknown }) => {
      if (!enableDebugLogs) return;
      log(level, message, payload);
    },
    [enableDebugLogs]
  );

  const { entries, streamError, isLoading, configuration } = useTaskLogsData({
    jobId,
    virtualLabId,
    projectId,
    configId,
    enabled,
    enableDebugLogs,
    isViewCampaign,
    debugLog,
  });

  if (!enabled) return null;

  return (
    <div
      id="job-viewer"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-neutral-50 px-4"
    >
      {activeTab === ViewerTabDict.Logs && (
        <LogsViewer
          entries={entries}
          streamError={streamError}
          isLoading={isLoading}
          enabled={enabled}
          searchDisabled={!jobId}
          isStreamingMode={!isViewCampaign}
        />
      )}
      {activeTab === ViewerTabDict.Configuration && (
        <div
          id="job-configuration-panel"
          className="secondary-scrollbar min-h-0 flex-1 overflow-y-auto pr-2"
        >
          <Configuration configuration={configuration} />
        </div>
      )}
    </div>
  );
}
