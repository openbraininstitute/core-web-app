'use client';

import { Empty } from 'antd';

import { getSimulationColor, SYNAPSE_CODE_TO_TYPE } from '@/constants/simulate/single-neuron';
import ConfigItem from '@/features/entities/single-neuron-synaptome/build/elements/config-item';
import {
  SECTION_TARGET_MAPPING,
  type SectionTargetMappingKeys,
} from '@/features/entities/single-neuron-synaptome/build/elements/constants';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';

type Props = {
  config: {
    synapses: Array<TSingleNeuronSynaptomeConfiguration>;
  } | null;
};

export default function SynapseGroupList({ config }: Props) {
  if (config && !config.synapses.length) {
    return <Empty description="No synapses found" />;
  }

  return (
    <div className="w-full">
      <h2 className="text-primary-8 mb-8 text-2xl font-bold">Synapse groups</h2>
      <div className="flex flex-row flex-wrap gap-4">
        {config?.synapses?.map(
          ({ id, name, formula, target, type, color, soma_synapse_count }, indx) => (
            <div
              key={id}
              className="flex w-max max-w-max min-w-96 flex-1 flex-col items-start justify-start"
            >
              <div
                className="flex items-center justify-center px-4 py-2 text-base text-white"
                style={{
                  backgroundColor: color ?? getSimulationColor(indx),
                }}
              >
                {indx + 1}
              </div>
              <div className="flex w-full flex-col gap-5 border border-gray-300 p-6">
                <ConfigItem {...{ label: 'name', value: name }} />
                <div className="grid grid-cols-2 gap-2">
                  <ConfigItem
                    {...{
                      label: 'target',
                      value: SECTION_TARGET_MAPPING[target as SectionTargetMappingKeys],
                    }}
                  />
                  <ConfigItem
                    {...{ label: 'type', value: type ? SYNAPSE_CODE_TO_TYPE[type] : undefined }}
                  />
                </div>
                {target === 'soma' ? (
                  <ConfigItem {...{ label: 'Synapse Count', value: `${soma_synapse_count}` }} />
                ) : (
                  <ConfigItem {...{ label: 'formula', value: formula }} />
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
