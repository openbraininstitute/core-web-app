import { Button, Divider } from 'antd';
import { useAtom } from 'jotai';
import { useRef } from 'react';

import useOnClickOutside from '@/hooks/useOnClickOutside';
import {
  getSimulationColor,
  RECORDING_LOCATION_CONFIGURATION_SESSION_KEY,
  STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  RecordLocationConfigurationAtomFamily,
  StimulationConfigurationAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { NeuronLocationOriginDict } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { classNames } from '@/util/utils';

export default function NeuronMeshInjectionRecordingPopover({
  show,
  data: { section, offset, x, y },
  onClose,
  sessionId,
}: {
  show: boolean;
  data: {
    x: number;
    y: number;
    section: string;
    offset: number;
  };
  sessionId?: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rlcKey = `${RECORDING_LOCATION_CONFIGURATION_SESSION_KEY}-${sessionId}`;
  const spcKey = `${STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY}-${sessionId}`;
  const [recordingLocations, setRecodingLocation] = useAtom(
    RecordLocationConfigurationAtomFamily(rlcKey)
  );
  const [injectConfigInSession, setInjectionConfigInSession] = useAtom(
    StimulationConfigurationAtomFamily(spcKey)
  );

  const onInject = () => {
    if (sessionId) {
      setInjectionConfigInSession({
        ...injectConfigInSession,
        inject_to: section,
      });
    }
    onClose();
  };

  const onRecord = () => {
    if (sessionId) {
      setRecodingLocation([
        ...recordingLocations,
        {
          section,
          offset,
          record_currents: false,
          origin: NeuronLocationOriginDict.recording,
          color: getSimulationColor(recordingLocations.length),
        },
      ]);
    }
    onClose();
  };

  useOnClickOutside(ref, onClose);

  if (!show) return;
  return (
    <div
      ref={ref}
      className={classNames(
        'fixed rounded-sm bg-white shadow-md',
        "z-0 after:absolute after:-top-1 after:left-1/2 after:h-0 after:w-0 after:-translate-x-1/2 after:rotate-45 after:border-4 after:border-white after:content-['']"
      )}
      style={{
        left: x - 113, // 113 is half of the container
        top: y + 8,
      }}
    >
      <Button onClick={onInject} className="z-10 w-max rounded-none" type="text">
        Move injection here
      </Button>
      <Divider orientation="center" type="vertical" className="mx-0" />
      <Button onClick={onRecord} className="z-10 w-32 rounded-none" type="text">
        Add recording
      </Button>
    </div>
  );
}
