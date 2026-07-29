import { Empty } from 'antd';
import { useReducer } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import { type TViewVariant, ViewVariant } from '@/constants';
import EphysViewerSkeleton from '@/features/ephys-viewer/components/ephys-viewer-skeleton';
import TraceDetailsView from '@/features/ephys-viewer/components/trace-details-view';
import TraceOverview from '@/features/ephys-viewer/components/trace-overview';
import {
  TraceViewMode,
  TraceViewModeToggle,
} from '@/features/ephys-viewer/components/trace-view-mode-toggle';
import { PROGRESS_MIN_BYTES } from '@/features/ephys-viewer/constants';
import useTrace from '@/features/ephys-viewer/hooks/use-nwb-trace';
import { TraceProvider } from '@/features/ephys-viewer/trace-context';
import { cn } from '@/utils/css-class';
import { formatBytes } from '@/utils/format';

import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { TTraceViewMode } from '@/features/ephys-viewer/components/trace-view-mode-toggle';
import type { WorkspaceContext } from '@/types/common';
import type { DownloadProgress } from '@/utils/h5/fs';

import './styles/ephys-plugin-styles.css';

/** Sentinel the selects use for "no narrowing", rather than a real cell or protocol name. */
const ALL = 'All';
const NONE = 'None';

/**
 * What the viewer is showing.
 *
 * These move together — picking a repetition from the overview sets the protocol, the repetition
 * and the view at once — so they are one state rather than four that each caller has to keep
 * consistent by hand.
 */
export type TViewerState = {
  view: TTraceViewMode;
  cellId: string;
  protocol: string;
  repetition: string | undefined;
};

export type ViewerAction =
  | { type: 'setView'; view: TTraceViewMode }
  | { type: 'setCellId'; cellId: string }
  | { type: 'setProtocol'; protocol: string }
  | { type: 'showRepetition'; protocol: string; repetition: string };

export function viewerReducer(state: TViewerState, action: ViewerAction): TViewerState {
  switch (action.type) {
    case 'setView':
      return { ...state, view: action.view };
    case 'setCellId':
      return { ...state, cellId: action.cellId };
    case 'setProtocol':
      return { ...state, protocol: action.protocol };
    case 'showRepetition':
      // a single transition, so the details view can never open on a protocol/repetition mismatch
      return {
        ...state,
        view: TraceViewMode.Detailed,
        protocol: action.protocol,
        repetition: action.repetition,
      };
    default:
      return state;
  }
}

/** Adapts the shared error component to the props `react-error-boundary` gives its fallback. */
function TraceErrorFallback({ error }: FallbackProps) {
  return <SimpleErrorComponent error={error as Error} />;
}

export default function EphysViewer({
  entity,
  assetId,
  ctx,
  defaultToInteractiveDetails = true,
  variant = ViewVariant.Light,
  protocol: protocolOverride,
}: {
  entity: IElectricalCellRecording | ISimulationResult;
  assetId?: string;
  ctx?: WorkspaceContext;
  defaultToInteractiveDetails?: boolean;
  variant?: TViewVariant;
  /**
   * Protocol to show, driven from outside. Matched case-insensitively against the protocols the
   * trace actually contains, so a caller can pass an eCode name without knowing how the NWB
   * capitalised it. Omit to let the viewer manage its own selection, as the detail pages do.
   */
  protocol?: string;
}) {
  const { index, progress, error, getSweepSeries, getCachedSweepSeries } = useTrace({
    entity,
    assetId,
    ctx,
  });

  const [state, dispatch] = useReducer(viewerReducer, {
    view: defaultToInteractiveDetails ? TraceViewMode.Detailed : TraceViewMode.Overview,
    cellId: ALL,
    protocol: ALL,
    repetition: undefined,
  });

  const protocol = protocolOverride ?? state.protocol;
  const requestedProtocol = protocol === NONE || protocol === ALL ? undefined : protocol;

  if (error) {
    return (
      <Empty className="p-2em" description="There was a problem loading the required resources" />
    );
  }

  if (!index) {
    // Without a Content-Length the size isn't knowable up front, so fall back to bytes received —
    // the card then appears mid-download, but still only for files big enough to warrant it.
    const download =
      progress && (progress.total ?? progress.received) >= PROGRESS_MIN_BYTES ? progress : null;

    return (
      <div className="relative">
        <div className={cn(download && 'pointer-events-none opacity-70 blur-[2px]')}>
          <EphysViewerSkeleton view={state.view} variant={variant} />
        </div>
        {download && (
          // Centred within the first 70vh rather than over the whole skeleton, which runs long
          // enough to push a truly centred card off screen — the detail view stacks two 40vh
          // plots below 2xl, and the overview grid collapses to one column of eight tiles.
          <div className="absolute inset-x-0 top-0 flex h-full max-h-[70vh] items-center justify-center">
            <DownloadStatus progress={download} variant={variant} />
          </div>
        )}
      </div>
    );
  }

  return (
    <TraceProvider
      index={index}
      getSweepSeries={getSweepSeries}
      getCachedSweepSeries={getCachedSweepSeries}
    >
      <div className="@container flex flex-col gap-6">
        <TraceViewModeToggle
          value={state.view}
          onChange={(e) => dispatch({ type: 'setView', view: e.target.value as TTraceViewMode })}
          variant={variant}
        />

        {state.view === TraceViewMode.Overview && (
          <ErrorBoundary
            FallbackComponent={TraceErrorFallback}
            resetKeys={[index, state.cellId, protocol]}
          >
            <TraceOverview
              cellId={state.cellId}
              onCellIdChange={(cellId) => dispatch({ type: 'setCellId', cellId })}
              protocol={protocol}
              onRepetitionClick={(protocolClosure, repetitionClosure) => () =>
                dispatch({
                  type: 'showRepetition',
                  protocol: protocolClosure,
                  repetition: repetitionClosure,
                })
              }
              onProtocolChange={(next) => dispatch({ type: 'setProtocol', protocol: next })}
              variant={variant}
            />
          </ErrorBoundary>
        )}

        {state.view === TraceViewMode.Detailed && (
          <ErrorBoundary
            FallbackComponent={TraceErrorFallback}
            resetKeys={[index, state.cellId, protocol, state.repetition]}
          >
            <TraceDetailsView
              defaultProtocol={requestedProtocol}
              defaultRepetition={state.repetition}
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
 * skeleton rather than being hidden behind it. Cache hits and anything under
 * `PROGRESS_MIN_BYTES` show the plain skeleton instead.
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
