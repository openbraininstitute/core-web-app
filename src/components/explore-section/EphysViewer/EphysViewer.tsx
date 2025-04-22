import { useState } from 'react';
import { Empty, Radio, RadioChangeEvent, Spin } from 'antd';
import { FileImageOutlined, LineChartOutlined } from '@ant-design/icons';
import { useAtomValue } from 'jotai';

import useTrace from './hooks/use-nwb-trace';
import TraceDetailsView from './components/TraceDetailsView';
import { ExperimentalTrace } from '@/types/explore-section/delta-experiment';
import TraceOverview from '@/components/explore-section/EphysViewer/components/TraceOverview';
import sessionAtom from '@/state/session';

import './styles/ephys-plugin-styles.scss';

enum VIEW {
  OVERVIEW = 'overview',
  DETAILED = 'detailed',
}

export default function EphysViewer({ resource }: { resource: ExperimentalTrace }) {
  const session = useAtomValue(sessionAtom);
  const [trace, error] = useTrace(resource, session);

  const [view, setView] = useState<VIEW>(VIEW.OVERVIEW);
  const [repetition, setRepetition] = useState<string>();
  const [protocol, setProtocol] = useState<string>('All');

  const handleViewChange = (e: RadioChangeEvent) => {
    setView(e.target.value as VIEW);
  };

  const showRepetitionDetails = (protocol: string, repetition: string) => () => {
    setProtocol(protocol);
    setRepetition(repetition);
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
