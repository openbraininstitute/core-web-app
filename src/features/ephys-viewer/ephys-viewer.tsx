import { Empty } from 'antd';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import { type TViewVariant, ViewVariant } from '@/constants';
import EphysViewerSkeleton from '@/features/ephys-viewer/components/ephys-viewer-skeleton';
import TraceDetailsView from '@/features/ephys-viewer/components/trace-details-view';
import TraceOverview from '@/features/ephys-viewer/components/trace-overview';
import {
  TraceViewMode,
  TraceViewModeToggle,
} from '@/features/ephys-viewer/components/trace-view-mode-toggle';
import useTrace from '@/features/ephys-viewer/hooks/use-nwb-trace';
import { TraceProvider } from '@/features/ephys-viewer/trace-context';
import { formatBytes } from '@/utils/format';

import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { WorkspaceContext } from '@/types/common';
import type { DownloadProgress } from '@/utils/h5/fs';

import './styles/ephys-plugin-styles.css';

export default function EphysViewer({
  entity,
  assetId,
  ctx,
  defaultToInteractiveDetails = true,
  variant = ViewVariant.Light,
}: {
  entity: IElectricalCellRecording | ISimulationResult;
  assetId?: string;
  ctx?: WorkspaceContext;
  defaultToInteractiveDetails?: boolean;
  variant?: TViewVariant;
}) {
  const { index, progress, error, getSweepSeries } = useTrace({ entity, assetId, ctx });

  const [view, setView] = useState<TraceViewMode>(
    defaultToInteractiveDetails ? TraceViewMode.DETAILED : TraceViewMode.OVERVIEW
  );
  const [repetition, setRepetition] = useState<string>();
  const [cellId, setCellId] = useState<string>('All');
  const [protocol, setProtocol] = useState<string>('All');

  const showRepetitionDetails = (protocolClosure: string, repetitionClosure: string) => () => {
    setProtocol(protocolClosure);
    setRepetition(repetitionClosure);
    setView(TraceViewMode.DETAILED);
  };

  if (error) {
    return (
      <Empty className="p-2em" description="There was a problem loading the required resources" />
    );
  }

  if (!index) {
    return (
      <>
        <DownloadStatus progress={progress} />
        <EphysViewerSkeleton view={view} variant={variant} />
      </>
    );
  }

  return (
    <TraceProvider index={index} getSweepSeries={getSweepSeries}>
      <div className="@container flex flex-col gap-6">
        <TraceViewModeToggle
          value={view}
          onChange={(e) => setView(e.target.value as TraceViewMode)}
          variant={variant}
        />

        {view === TraceViewMode.OVERVIEW && (
          <ErrorBoundary
            FallbackComponent={SimpleErrorComponent}
            resetKeys={[index, cellId, protocol]}
          >
            <TraceOverview
              cellId={cellId}
              onCellIdChange={setCellId}
              protocol={protocol}
              onRepetitionClick={showRepetitionDetails}
              onProtocolChange={setProtocol}
              variant={variant}
            />
          </ErrorBoundary>
        )}

        {view === TraceViewMode.DETAILED && (
          <ErrorBoundary
            FallbackComponent={SimpleErrorComponent}
            resetKeys={[index, cellId, protocol, repetition]}
          >
            <TraceDetailsView
              defaultProtocol={protocol === 'None' || protocol === 'All' ? undefined : protocol}
              defaultRepetition={repetition}
              variant={variant}
            />
          </ErrorBoundary>
        )}
      </div>
    </TraceProvider>
  );
}

/**
 * NWB recordings run to hundreds of megabytes, so the download gets a byte counter rather
 * than being hidden behind the skeleton. A cache hit reports no progress and shows nothing.
 */
function DownloadStatus({ progress }: { progress: DownloadProgress | null }) {
  if (!progress) return null;

  const received = formatBytes(progress.received, 0);

  return (
    <div className="text-neutral-4 pb-2 text-sm">
      {progress.total
        ? `Downloading recording… ${received} / ${formatBytes(progress.total, 0)}`
        : `Downloading recording… ${received}`}
    </div>
  );
}
