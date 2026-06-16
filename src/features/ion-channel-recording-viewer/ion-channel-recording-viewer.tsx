import { FileImageOutlined, LineChartOutlined } from '@ant-design/icons';
import { Empty, Radio, type RadioChangeEvent, Spin } from 'antd';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/ui/molecules/error-fallback';

import { TraceDetailsView } from './components/trace-details-view';
import { TraceOverview } from './components/trace-overview';
import useTrace from './hooks/use-nwb-trace';

import type { IIonChannelRecording } from '@/api/entitycore/types/entities/ion-channel-recording';
import type { WorkspaceContext } from '@/types/common';

// import './styles/ephys-plugin-styles.css';

enum VIEW {
  OVERVIEW = 'overview',
  DETAILED = 'detailed',
}

export default function IonChannelRecordingViewer({
  resource,
  ctx,
}: {
  resource: IIonChannelRecording;
  ctx?: WorkspaceContext;
}) {
  const [trace, error] = useTrace({ resource, ctx });
  const [view, setView] = useState<VIEW>(VIEW.OVERVIEW);

  const handleViewChange = (e: RadioChangeEvent) => {
    setView(e.target.value as VIEW);
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
        <ErrorBoundary FallbackComponent={SimpleErrorComponent} resetKeys={[trace]}>
          <TraceOverview trace={trace} />
        </ErrorBoundary>
      )}

      {view === VIEW.DETAILED && (
        <ErrorBoundary FallbackComponent={SimpleErrorComponent} resetKeys={[trace]}>
          <TraceDetailsView trace={trace} />
        </ErrorBoundary>
      )}
    </div>
  );
}
