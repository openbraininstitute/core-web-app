import { IonChannelRecordingParser } from '../ion-channel-recording-parser';

export interface TraceOverviewProps {
  trace: IonChannelRecordingParser;
}

export default function TraceOverview({ trace }: TraceOverviewProps) {
  // eslint-disable-next-line no-console
  console.log('🚀 [trace-overview] trace =', trace); // @FIXME: Remove this line written on 2025-10-22 at 14:48
  return <div>[TraceOverview] Work in progress...</div>;
}
