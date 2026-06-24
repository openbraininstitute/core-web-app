import { Empty, Spin } from 'antd';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import { type TViewVariant, ViewVariant } from '@/constants';
import {
  TraceViewMode,
  TraceViewModeToggle,
} from '@/features/ephys-viewer/components/trace-view-mode-toggle';

import { TraceDetailsView } from './components/trace-details-view';
import { TraceOverview } from './components/trace-overview';
import useTrace from './hooks/use-nwb-trace';

import type { IIonChannelRecording } from '@/api/entitycore/types/entities/ion-channel-recording';
import type { WorkspaceContext } from '@/types/common';

// import './styles/ephys-plugin-styles.css';

export default function IonChannelRecordingViewer({
  resource,
  ctx,
  variant = ViewVariant.Light,
}: {
  resource: IIonChannelRecording;
  ctx?: WorkspaceContext;
  variant?: TViewVariant;
}) {
  const [trace, error] = useTrace({ resource, ctx });
  const [view, setView] = useState<TraceViewMode>(TraceViewMode.DETAILED);

  if (error) {
    return (
      <Empty className="p-2em" description="There was a problem loading the required resources" />
    );
  }

  if (!trace) {
    return <Spin />;
  }

  return (
    <div className="@container flex flex-col gap-6">
      <TraceViewModeToggle
        value={view}
        onChange={(e) => setView(e.target.value as TraceViewMode)}
        variant={variant}
      />

      {view === TraceViewMode.OVERVIEW && (
        <ErrorBoundary FallbackComponent={SimpleErrorComponent} resetKeys={[trace]}>
          <TraceOverview trace={trace} variant={variant} />
        </ErrorBoundary>
      )}

      {view === TraceViewMode.DETAILED && (
        <ErrorBoundary FallbackComponent={SimpleErrorComponent} resetKeys={[trace]}>
          <TraceDetailsView trace={trace} variant={variant} />
        </ErrorBoundary>
      )}
    </div>
  );
}
