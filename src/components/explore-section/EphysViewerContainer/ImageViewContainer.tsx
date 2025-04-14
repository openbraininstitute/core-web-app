import { NexusImage } from './NexusImage';
import ImageViewComponent from './ImageViewComponent';
import NWBTrace from './nwb-trace';

interface ImageViewContainerProps {
  trace: NWBTrace;
  stimulusType: string;
  onStimulusChange: (value: string) => void;
  onRepetitionClicked: (stimulusType: string, rep: string) => () => void;
}

function ImageViewContainer({
  trace,
  stimulusType,
  onRepetitionClicked,
  onStimulusChange,
}: ImageViewContainerProps) {
  return (
    <>
      <ImageViewComponent
        {...{
          trace,
          stimulusType,
          onStimulusChange,
          onRepetitionClicked,
          // eslint-disable-next-line react/no-unstable-nested-components
          imagePreview: ({ imageUrl }) => (
            // We need to put this as a prop because it contains effects (container, not component)
            <NexusImage
              {...{
                imageUrl,
                org: orgLabel,
                project: projectLabel,
              }}
            />
          ),
        }}
      />
    </>
  );
}

export default ImageViewContainer;
