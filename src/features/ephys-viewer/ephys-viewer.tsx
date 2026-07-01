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

import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { WorkspaceContext } from '@/types/common';

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
  const [trace, error] = useTrace({ entity, assetId, ctx });

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

  if (!trace) {
    return <EphysViewerSkeleton view={view} variant={variant} />;
  }

  return (
    <div className="@container flex flex-col gap-6">
      <TraceViewModeToggle
        value={view}
        onChange={(e) => setView(e.target.value as TraceViewMode)}
        variant={variant}
      />

      {view === TraceViewMode.OVERVIEW && (
        <ErrorBoundary
          FallbackComponent={SimpleErrorComponent}
          resetKeys={[trace, cellId, protocol]}
        >
          <TraceOverview
            trace={trace}
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
          resetKeys={[trace, cellId, protocol, repetition]}
        >
          <TraceDetailsView
            trace={trace}
            defaultProtocol={protocol === 'None' || protocol === 'All' ? undefined : protocol}
            defaultRepetition={repetition}
            variant={variant}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
