import { IonChannelRecordingParser } from '../ion-channel-recording-parser';

export interface TraceDetailsViewProps {
  trace: IonChannelRecordingParser;
}

export default function TraceDetailsView({ trace }: TraceDetailsViewProps) {
  // eslint-disable-next-line no-console
  console.log('🚀 [trace-details-view] trace =', trace); // @FIXME: Remove this line written on 2025-10-22 at 14:48
  return <div>[TraceDetailsViewProps] Work in progress...</div>;
}
