'use client';

import { RiFileList3Line, RiTerminalBoxLine } from '@remixicon/react';
import { Activity, useCallback, useEffect, useState } from 'react';

import {
  ScanConfigCampaignOriginActionDict,
  type TScanConfigCampaignOriginActionDict,
} from '@/features/scan-config/helpers';
import { Configuration } from '@/features/task-logs-stream/elements/configuration';
import { LogsViewer } from '@/features/task-logs-stream/elements/logger';
import { useTaskLogsData } from '@/features/task-logs-stream/hooks/use-task-logs';
import { ViewerTabDict } from '@/features/task-logs-stream/types';
import { TabsSelector } from '@/ui/segments/shared/scope-selector';
import { log } from '@/utils/logger';

import type { TLogLevel, TViewerTab } from '@/features/task-logs-stream/types';

interface IProps {
  jobId?: string;
  virtualLabId: string;
  projectId: string;
  configId?: string;
  enabled: boolean;
  enableDebugLogs?: boolean;
  /** when true, skip the stream and read the job directly (e.g. terminal execution status) */
  skipStream?: boolean;
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
  skipStream = false,
  campaignOriginAction,
  isCampaignIdChanged,
}: IProps) {
  const isViewCampaign =
    campaignOriginAction === ScanConfigCampaignOriginActionDict.View && !isCampaignIdChanged;

  const [activeTab, setActiveTab] = useState<TViewerTab>(ViewerTabDict.Logs);

  // reset to Logs tab when the underlying job or config changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: jobId and configId are intentional trigger dependencies
  useEffect(() => {
    setActiveTab(ViewerTabDict.Logs);
  }, [jobId, configId]);

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
    skipStream,
    debugLog,
  });

  if (!enabled) return null;

  return (
    <div
      id="job-viewer"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-neutral-50 px-4"
    >
      <TabsSelector
        id="job-viewer-tabs"
        className="mb-3 w-max"
        activeTab={activeTab}
        onValueChange={(value) => setActiveTab(value as TViewerTab)}
        items={[
          {
            key: ViewerTabDict.Logs,
            title: 'Logs',
            icon: <RiTerminalBoxLine size={16} />,
          },
          {
            key: ViewerTabDict.Configuration,
            title: 'Configuration',
            icon: <RiFileList3Line size={16} />,
          },
        ]}
      />
      <Activity mode={activeTab === ViewerTabDict.Logs ? 'visible' : 'hidden'}>
        <LogsViewer
          entries={entries}
          streamError={streamError}
          isLoading={isLoading}
          enabled={enabled}
          searchDisabled={!jobId}
          isStreamingMode={!isViewCampaign}
        />
      </Activity>
      <Activity mode={activeTab === ViewerTabDict.Configuration ? 'visible' : 'hidden'}>
        <div
          id="job-configuration-panel"
          className="secondary-scrollbar min-h-0 flex-1 overflow-y-auto pr-2"
        >
          <Configuration configuration={configuration} />
        </div>
      </Activity>
    </div>
  );
}
