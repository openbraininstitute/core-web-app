import { TraceOverviewPlot } from './trace-overview-plot';

import type { IonChannelRecordingParser } from '../../ion-channel-recording-parser';

import styles from './trace-overview.module.css';

export interface TraceOverviewProps {
  trace: IonChannelRecordingParser;
}

export function TraceOverview({ trace }: TraceOverviewProps) {
  return (
    <div className={styles.traceOverview}>
      {trace.protocols.map((protocol) => (
        <div key={protocol.name}>
          <h2>
            {protocol.name}{' '}
            <small>
              {protocol.repetitions.length} repetition{protocol.repetitions.length > 1 ? 's' : ''}
            </small>
          </h2>
          <div className={styles.repetitions}>
            {protocol.stimuli.lines.length > 0 && (
              <div key="Stimulis">
                <h3>Stimuli</h3>
                <TraceOverviewPlot plot={protocol.stimuli} />
              </div>
            )}
            {protocol.repetitions.map((repetition) => (
              <div key={repetition.name}>
                <h3>{repetition.name}</h3>
                <TraceOverviewPlot
                  plot={trace.findRepetition(protocol.name, repetition.name)?.plot}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
