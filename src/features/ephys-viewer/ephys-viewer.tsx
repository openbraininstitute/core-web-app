import { useState } from 'react';
import { Empty, Radio, RadioChangeEvent, Spin } from 'antd';
import { FileImageOutlined, LineChartOutlined } from '@ant-design/icons';
import { useAtomValue } from 'jotai';

import sessionAtom from '@/state/session';
import useTrace from '@/features/ephys-viewer/hooks/use-nwb-trace';
import TraceDetailsView from '@/features/ephys-viewer/components/trace-details-view';
import TraceOverview from '@/features/ephys-viewer/components/trace-overview';

import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import './styles/ephys-plugin-styles.css';

enum VIEW {
  OVERVIEW = 'overview',
  DETAILED = 'detailed',
}

export default function EphysViewer({ resource }: { resource: IElectricalCellRecording }) {
  const session = useAtomValue(sessionAtom);
  const [trace, error] = useTrace(resource, session);

  const [view, setView] = useState<VIEW>(VIEW.OVERVIEW);
  const [repetition, setRepetition] = useState<string>();
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
    <div className="flex flex-col gap-6">
      <Radio.Group onChange={handleViewChange} value={view}>
        <Radio.Button value={VIEW.OVERVIEW}>
          <FileImageOutlined /> Overview
        </Radio.Button>

        <Radio.Button value={VIEW.DETAILED}>
          <LineChartOutlined /> Interactive Details
        </Radio.Button>
      </Radio.Group>

      {view === VIEW.OVERVIEW && (
        <TraceOverview
          trace={trace}
          protocol={protocol}
          onRepetitionClick={showRepetitionDetails}
          onProtocolChange={setProtocol}
        />
      )}

      {view === VIEW.DETAILED && (
        <TraceDetailsView
          trace={trace}
          defaultProtocol={protocol === 'None' || protocol === 'All' ? undefined : protocol}
          defaultRepetition={repetition}
        />
      )}
    </div>
  );
}
