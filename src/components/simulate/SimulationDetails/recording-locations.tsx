import { InfoCircleOutlined } from '@ant-design/icons';

import CustomPopover from '@/features/entities/neuron-simulation/experiment/elements/popover';
import type { RecordLocation } from '@/types/small-scale-simulator/single-neuron';

type RecordingLocationItemProps = {
  recordingLocation: RecordLocation;
  index: number;
};

function RecordingLocationItem({ recordingLocation, index }: RecordingLocationItemProps) {
  const { section, offset } = recordingLocation;
  return (
    <div className="flex flex-col">
      <div className="text-gray-400 uppercase">Recording {index + 1}</div>
      <div className="flex max-w-max items-center justify-start gap-3 border border-gray-100 px-2">
        <span className="text-primary-8 text-base font-bold capitalize">{section}</span>
        <div className="ml-14 flex items-center gap-2">
          <span className="text-sm text-gray-400 uppercase">offset</span>
          <CustomPopover
            message="The recording position relative to the section. 0 being the start of the section and 1 being the end."
            when={['hover']}
          >
            <InfoCircleOutlined className="cursor-pointer text-gray-400" />
          </CustomPopover>
          <span className="text-primary-8 py-1 text-base font-bold">{offset}</span>
        </div>
      </div>
    </div>
  );
}

type Props = {
  recordingLocations: RecordLocation[];
};

export default function RecordingLocations({ recordingLocations }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {recordingLocations?.map((r, ind) => (
        <RecordingLocationItem key={`${r.section}_${r.offset}`} recordingLocation={r} index={ind} />
      ))}
    </div>
  );
}
