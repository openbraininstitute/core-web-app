import { useRef } from 'react';
import { Button, Divider } from 'antd';
import { useAtom } from 'jotai';

import { currentInjectionSimulationConfigAtom } from '@/state/simulate/categories/current-injection-simulation';
import { useRecordingSourceForSimulation } from '@/state/simulate/categories';
import useOnClickOutside from '@/hooks/useOnClickOutside';
import {
  getSimulationColor,
  PREFIX_RECORDING_LOCATION_CONFIGURATION_SESSION_KEY,
  PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  RecordLocationConfigurationAtomFamily,
  StimulationConfigurationAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { classNames } from '@/util/utils';
import { NeuronLocationOriginDict } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';

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
  const { add } = useRecordingSourceForSimulation();
  const rlcKey = `${PREFIX_RECORDING_LOCATION_CONFIGURATION_SESSION_KEY}-${sessionId}`;
  const spcKey = `${PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY}-${sessionId}`;
  const [recordingLocations, setRecodingLocation] = useAtom(
    RecordLocationConfigurationAtomFamily(rlcKey)
  );
  const [injectionConfig, setInjectionConfig] = useAtom(currentInjectionSimulationConfigAtom);
  const [injectConfigInSession, setInjectionConfigInSession] = useAtom(
    StimulationConfigurationAtomFamily(spcKey)
  );

  const onInject = () => {
    if (injectionConfig.length === 0) {
      onClose();
      return;
    }

    if (sessionId) {
      setInjectionConfigInSession({
        ...injectConfigInSession,
        inject_to: section,
      });
    } else {
      setInjectionConfig([
        { ...injectionConfig[0], inject_to: section },
        ...injectionConfig.slice(1),
      ]);
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
    } else {
      add({
        section,
        offset,
        record_currents: false,
        origin: NeuronLocationOriginDict.recording,
        color: getSimulationColor(recordingLocations.length),
      });
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
