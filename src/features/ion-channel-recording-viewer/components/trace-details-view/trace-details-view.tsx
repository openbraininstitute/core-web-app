import React from 'react';

import { IonChannelRecordingParser } from '../../ion-channel-recording-parser';
import OptionSelect from '@/features/ephys-viewer/components/option-select';

import styles from './trace-details-view.module.css';
import SweepSelector from '@/features/ephys-viewer/components/sweep-selector';
import { useColorMap, usePlotParams, useVisibleLines } from './hooks';
import { GenericPlot } from '../generic-plot';
import { factory } from './factory';

export interface TraceDetailsViewProps {
  trace: IonChannelRecordingParser;
}

export function TraceDetailsView({ trace }: TraceDetailsViewProps) {
  const protocolsNames = trace.protocols.map(({ name }) => name);
  const [protocolName, setProtocolName] = React.useState<string>(protocolsNames[0] ?? '');
  const repetitionsNames = React.useMemo(() => {
    const protocol = trace.protocols.find(({ name }) => name === protocolName);
    if (!protocol) return [];

    return protocol.repetitions.map(({ name }) => name);
  }, [protocolName, trace]);
  const [repetitionName, setRepetitionName] = React.useState(repetitionsNames[0] ?? '');
  React.useEffect(() => {
    setRepetitionName(repetitionsNames[0] ?? '');
  }, [protocolName, repetitionsNames]);
  const plot = React.useMemo(
    () => trace.findRepetition(protocolName, repetitionName)?.plot,
    [trace, protocolName, repetitionName]
  );
  const lines = useVisibleLines(plot);
  const colorMap = useColorMap(plot);
  const params = usePlotParams(plot, colorMap, lines.selection, lines.preview);
  return (
    <div className={styles.main}>
      <header>
        <OptionSelect
          label={{ title: 'Protocol', numberOfAvailable: protocolsNames.length }}
          value={protocolName}
          onChange={setProtocolName}
          options={protocolsNames.map((name) => (
            <div key={name}>{name}</div>
          ))}
        />
        <OptionSelect
          label={{ title: 'Repetition', numberOfAvailable: repetitionsNames.length }}
          value={repetitionName}
          onChange={setRepetitionName}
          options={repetitionsNames.map((name) => (
            <div key={name}>{name}</div>
          ))}
        />
      </header>
      <SweepSelector
        onPreviewSweep={lines.setPreview}
        previewItem={lines.preview}
        selectedSweeps={lines.selection}
        setSelectedSweeps={lines.setSelection}
        colorMap={colorMap}
        sweepOptions={(plot?.lines ?? []).map(({ id }) => ({ label: id, value: id }))}
      />
      <GenericPlot className={styles.plot} data={params} factory={factory} />
    </div>
  );
}
