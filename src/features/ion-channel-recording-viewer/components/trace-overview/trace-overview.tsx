import type { EphysViewerVariant } from '@/features/ephys-viewer/label-styles';
import { cn } from '@/utils/css-class';

import { IonChannelRecordingParser } from '../../ion-channel-recording-parser';
import { TraceOverviewPlot } from './trace-overview-plot';

import styles from './trace-overview.module.css';

export interface TraceOverviewProps {
  trace: IonChannelRecordingParser;
  variant?: EphysViewerVariant;
}

export function TraceOverview({ trace, variant = 'light' }: TraceOverviewProps) {
  return (
    <div
      className={cn(
        styles.traceOverview,
        variant === 'onPrimary' &&
          '[&_h2]:!border-white [&_h2]:!text-white [&_h2_small]:!text-white/80 [&_h3]:!text-white'
      )}
    >
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
