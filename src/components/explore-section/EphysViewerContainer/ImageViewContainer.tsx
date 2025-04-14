import { NexusImage } from './NexusImage';
import TraceOverviewComponent from './ImageViewComponent';
import NWBTrace from './nwb-trace';

interface ImageViewContainerProps {
  trace: NWBTrace;
  stimulusType: string;
  onStimulusChange: (value: string) => void;
  onRepetitionClick: (stimulusType: string, rep: string) => () => void;
}

function TraceOverview({
  trace,
  stimulusType,
  onRepetitionClick,
  onStimulusChange,
}: ImageViewContainerProps) {
  return (
    <>
      <TraceOverviewComponent
        trace={trace}
        protocol={stimulusType}
        onStimulusChange={onStimulusChange}
        onRepetitionClick={onRepetitionClick}
      />
    </>
  );
}

export default TraceOverview;
