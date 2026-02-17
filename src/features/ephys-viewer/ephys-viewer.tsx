import { FileImageOutlined, LineChartOutlined } from '@ant-design/icons';
import { Empty, Radio, type RadioChangeEvent, Spin } from 'antd';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import TraceDetailsView from '@/features/ephys-viewer/components/trace-details-view';
import TraceOverview from '@/features/ephys-viewer/components/trace-overview';
import useTrace from '@/features/ephys-viewer/hooks/use-nwb-trace';

import type { ICircuitSimulationResult } from '@/api/entitycore/types/entities/circuit-simulation-result';
import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { WorkspaceContext } from '@/types/common';

import './styles/ephys-plugin-styles.css';

enum VIEW {
  OVERVIEW = 'overview',
  DETAILED = 'detailed',
}

export default function EphysViewer({
  resource,
  ctx,
}: {
  resource: IElectricalCellRecording | ICircuitSimulationResult;
  ctx?: WorkspaceContext;
}) {
  const [trace, error] = useTrace({ resource, ctx });

  const [view, setView] = useState<VIEW>(VIEW.OVERVIEW);
  const [repetition, setRepetition] = useState<string>();
  const [cellId, setCellId] = useState<string>('All');
  const [protocol, setProtocol] = useState<string>('All');

  const handleViewChange = (e: RadioChangeEvent) => {
    setView(e.target.value as VIEW);
  };

  const showRepetitionDetails = (protocolClosure: string, repetitionClosure: string) => () => {
    setProtocol(protocolClosure);
    setRepetition(repetitionClosure);
    setView(VIEW.DETAILED);
  };

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
      <Radio.Group onChange={handleViewChange} value={view}>
        <Radio.Button value={VIEW.OVERVIEW}>
          <FileImageOutlined /> Overview
        </Radio.Button>

        <Radio.Button value={VIEW.DETAILED}>
          <LineChartOutlined /> Interactive Details
        </Radio.Button>
      </Radio.Group>

      {view === VIEW.OVERVIEW && (
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
          />
        </ErrorBoundary>
      )}

      {view === VIEW.DETAILED && (
        <ErrorBoundary
          FallbackComponent={SimpleErrorComponent}
          resetKeys={[trace, cellId, protocol, repetition]}
        >
          <TraceDetailsView
            trace={trace}
            defaultProtocol={protocol === 'None' || protocol === 'All' ? undefined : protocol}
            defaultRepetition={repetition}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
