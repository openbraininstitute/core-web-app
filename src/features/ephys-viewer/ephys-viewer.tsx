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
import { cn } from '@/utils/css-class';
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
      <div className="relative">
        <div className={cn(progress && 'pointer-events-none opacity-70 blur-[2px]')}>
          <EphysViewerSkeleton view={view} variant={variant} />
        </div>
        {progress && (
          // Centred within the first 70vh rather than over the whole skeleton, which runs long
          // enough to push a truly centred card off screen — the detail view stacks two 40vh
          // plots below 2xl, and the overview grid collapses to one column of eight tiles.
          <div className="absolute inset-x-0 top-0 flex h-full max-h-[70vh] items-center justify-center">
            <DownloadStatus progress={progress} variant={variant} />
          </div>
        )}
      </div>
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
 * NWB recordings run to hundreds of megabytes, so the download gets its own card over the
 * skeleton rather than being hidden behind it. A cache hit reports no progress and shows nothing.
 *
 * `total` is null when the response carries no Content-Length, which is the only case where the
 * bar can't be determinate.
 */
function DownloadStatus({
  progress,
  variant,
}: {
  progress: DownloadProgress;
  variant: TViewVariant;
}) {
  const isDark = variant === ViewVariant.Default;
  const received = formatBytes(progress.received, 0);
  const percent = progress.total
    ? Math.min(100, Math.round((progress.received / progress.total) * 100))
    : null;

  return (
    <div
      className={cn(
        'flex w-[min(20rem,80%)] flex-col gap-2 rounded-lg border px-5 py-4 shadow-lg backdrop-blur-sm',
        isDark
          ? 'bg-primary-9/80 border-white/20 text-white'
          : 'border-neutral-2 text-neutral-6 bg-white/90'
      )}
    >
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>Downloading recording…</span>
        {percent !== null && <span className="tabular-nums opacity-70">{percent}%</span>}
      </div>

      <div
        className={cn(
          'h-1 w-full overflow-hidden rounded-full',
          isDark ? 'bg-white/20' : 'bg-neutral-2'
        )}
        role="progressbar"
        aria-label="Downloading recording"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
      >
        <div
          className={cn(
            'h-full rounded-full',
            isDark ? 'bg-primary-2' : 'bg-primary-5',
            // Without a total there is nothing to fill towards, so show an indeterminate sweep.
            percent === null ? 'w-1/3 animate-pulse' : 'transition-[width] duration-200 ease-out'
          )}
          style={percent === null ? undefined : { width: `${percent}%` }}
        />
      </div>

      <div className={cn('text-xs tabular-nums', isDark ? 'text-white/70' : 'text-neutral-4')}>
        {progress.total ? `${received} / ${formatBytes(progress.total, 0)}` : received}
      </div>
    </div>
  );
}
