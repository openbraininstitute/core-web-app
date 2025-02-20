'use client';

import { Empty, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

import {
  sectionTargetMapping,
  SectionTargetMappingKeys,
} from '@/components/build-section/virtual-lab/synaptome/molecules/constants';
import { getSimulationColor, SYNPASE_CODE_TO_TYPE } from '@/constants/simulate/single-neuron';
import { useModelConfiguration } from '@/hooks/useModelConfiguration';
import { SynaptomeConfigDistribution } from '@/types/synaptome';

import ConfigItem from '@/components/build-section/virtual-lab/synaptome/molecules/ConfigItem';

export default function SynapseGroupList({ modelUrl }: { modelUrl: string }) {
  const { configuration, loading } = useModelConfiguration<SynaptomeConfigDistribution>({
    contentUrl: modelUrl,
  });

  if (loading)
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <Spin indicator={<LoadingOutlined />} size="large" />
        <h2 className="font-light text-primary-9">Loading Synaptome Model configuration ...</h2>
      </div>
    );

  if (!loading && !configuration) return <Empty description="No synapses found" />;

  return (
    <div className="w-full">
      <h2 className="mb-8 text-2xl font-bold text-primary-8">Synapse groups</h2>
      <div className="flex flex-row flex-wrap gap-4">
        {configuration?.synapses?.map(
          ({ id, name, formula, target, type, color, soma_synapse_count }, indx) => (
            <div
              key={id}
              className="flex w-max min-w-96 max-w-max flex-1 flex-col items-start justify-start"
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
                      value: sectionTargetMapping[target as SectionTargetMappingKeys],
                    }}
                  />
                  <ConfigItem
                    {...{ label: 'type', value: type ? SYNPASE_CODE_TO_TYPE[type] : undefined }}
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
