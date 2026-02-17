import React from 'react';

import OptionSelect from '@/features/ephys-viewer/components/option-select';
import SweepSelector from '@/features/ephys-viewer/components/sweep-selector';
import { cn } from '@/utils/css-class';

import { GenericPlot } from '../generic-plot';
import { factory } from './factory';
import { useColorMap, usePlotParams, useVisibleLines } from './hooks';

import type { IonChannelRecordingParser } from '../../ion-channel-recording-parser';

import styles from './trace-details-view.module.css';

export interface TraceDetailsViewProps {
  trace: IonChannelRecordingParser;
  cls?: { plots: string };
}

export function TraceDetailsView({ trace, cls }: TraceDetailsViewProps) {
  const protocolsNames = trace.protocols.map(({ name }) => name);
  const [protocolName, setProtocolName] = React.useState<string>(protocolsNames[0] ?? '');
  const protocol = React.useMemo(
    () => trace.protocols.find((p) => p.name === protocolName),
    [protocolName, trace.protocols]
  );
  const repetitionsNames = React.useMemo(() => {
    if (!protocol) return [];

    return protocol.repetitions.map(({ name }) => name);
  }, [protocol]);
  const [repetitionName, setRepetitionName] = React.useState(repetitionsNames[0] ?? '');
  React.useEffect(() => {
    setRepetitionName(repetitionsNames[0] ?? '');
  }, [repetitionsNames]);
  const repetition = React.useMemo(
    () => trace.findRepetition(protocolName, repetitionName),
    [trace, protocolName, repetitionName]
  );
  const lines = useVisibleLines(repetition?.plot);
  const colorMap = useColorMap(repetition?.plot);
  const { paramsRepetition, paramsStimuli } = usePlotParams(
    protocol,
    repetition,
    colorMap,
    lines.selection,
    lines.preview
  );
  return (
    <div className={styles.main}>
      <header>
        <OptionSelect
          label={{ title: 'Protocol', numberOfAvailable: protocolsNames.length }}
          value={protocolName}
          onChange={setProtocolName}
          options={protocolsNames.map((name) => <div key={name}>{name}</div>)}
        />
        {repetitionsNames.length > 1 && (
          <OptionSelect
            label={{ title: 'Repetition', numberOfAvailable: repetitionsNames.length }}
            value={repetitionName}
            onChange={setRepetitionName}
            options={repetitionsNames.map((name) => <div key={name}>{name}</div>)}
          />
        )}
      </header>
      <SweepSelector
        onPreviewSweep={lines.setPreview}
        previewItem={lines.preview}
        selectedSweeps={lines.selection}
        setSelectedSweeps={lines.setSelection}
        colorMap={colorMap}
        sweepOptions={(repetition?.plot.lines ?? []).map(({ id }) => ({ label: id, value: id }))}
      />
      <div className={cn(styles.plots, cls?.plots)}>
        {(paramsStimuli.plot?.lines ?? []).length > 0 && (
          <div>
            <h3>Stimuli</h3>
            <GenericPlot className={styles.plot} data={paramsStimuli} factory={factory} />
          </div>
        )}
        <div>
          <h3>Repetition</h3>
          <GenericPlot className={styles.plot} data={paramsRepetition} factory={factory} />
        </div>
      </div>
    </div>
  );
}
