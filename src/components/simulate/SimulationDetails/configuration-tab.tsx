'use client';

import { RightOutlined } from '@ant-design/icons';
import { Collapse } from 'antd';

import ConditionsDetails from './ConditionsDetails';
import RecordingLocations from './recording-locations';
import SynapticInputs from './SynapticInputs';
import StimulationDetails from './stimulation-details';

import type { SimulationType } from '@/types/small-scale-simulator/common';
import type { SimulationPayload } from '@/types/small-scale-simulator/single-neuron';

type Props = {
  type: SimulationType;
  simulation: SimulationPayload;
};

function CollapseIcon({ isActive }: { isActive?: boolean }) {
  return <RightOutlined rotate={isActive ? 90 : 0} className="text-primary-8! font-bold!" />;
}

export default function SimulationConfigurationTab({ simulation, type }: Props) {
  const allItems = [
    {
      key: 'conditions-config',
      label: <h4 className="text-primary-8 text-xl font-bold">Experiment setup</h4>,
      children: <ConditionsDetails conditions={simulation.config.conditions} />,
    },
    {
      key: 'synaptic-inputs',
      label: <h4 className="text-primary-8 text-xl font-bold">Synaptic Inputs</h4>,
      children: <SynapticInputs synapses={simulation.config.synaptome ?? []} />,
    },
    {
      key: 'stimulation-config',
      label: <h4 className="text-primary-8 text-xl font-bold">Stimulation Protocol</h4>,
      children: (
        <StimulationDetails
          currentInjection={simulation.config.current_injection}
          stimulusData={simulation.stimulus}
        />
      ),
    },
    {
      key: 'recording-locations',
      label: <h4 className="text-primary-8 text-xl font-bold">Recordings</h4>,
      children: <RecordingLocations recordingLocations={simulation.config.record_from} />,
    },
  ];

  const items =
    type === 'single-neuron-simulation'
      ? allItems.filter((o) => o.key !== 'synaptic-inputs')
      : allItems;

  return (
    <Collapse
      ghost
      bordered={false}
      defaultActiveKey={[
        'conditions-config',
        'synaptic-inputs',
        'stimulation-config',
        'recording-locations',
      ]}
      expandIconPosition="end"
      expandIcon={CollapseIcon}
      items={items}
    />
  );
}
