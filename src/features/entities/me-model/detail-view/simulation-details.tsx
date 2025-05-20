import React, { useEffect, useState } from 'react';
import { InfoCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { ConfigProvider, Segmented, Spin } from 'antd';
import { SegmentedValue } from 'antd/lib/segmented';
import get from 'lodash/get';
import SimulationPlotAsImage from './simulation-plot-as-image';
import CustomPopover from '@/components/simulate/single-neuron/molecules/Popover';
import { SimulationPayload } from '@/types/simulation/single-neuron';
import { classNames } from '@/util/utils';
import { ISingleNeuronSimulation } from '@/api/entitycore/types/entities/single-neuron-simulation';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { notification } from '@/api/notifications';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeEnum } from '@/api/entitycore/types';
import { SingleNeuronSimulation } from '@/entity-configuration/domain/model';

const subtitleStyle = 'font-thin text-neutral-4';

type GenericSimulation = ISingleNeuronSimulation; // TODO ADD SYNAPTOME SIMULATION

type Props<T> = {
  index: number;
  simulation: T;
  virtualLabId: string;
  projectId: string;
};

export default function SimulationDetail<T extends GenericSimulation>({
  index,
  simulation,
  virtualLabId,
  projectId,
}: Props<T>) {
  const [simConfig, setSimConfig] = useState<SimulationPayload | null>(null);
  const [simulationPlot, setSimulationPlot] = useState<SegmentedValue | undefined>(undefined);
  const [loadingConfig, setLoadingConfig] = useState(false);

  useEffect(() => {
    const asset = simulation.assets.find(
      (a) => a.label === SingleNeuronSimulation.asset.configfile
    );

    if (!asset) {
      notification.error('Cannot find simulation config');
      return;
    }

    const fetchPayload = async () => {
      setLoadingConfig(true);
      try {
        const configRes = await downloadAsset<Buffer>({
          ctx: { virtualLabId, projectId },
          entityType: EntityTypeEnum.SingleNeuronSimulation,
          entityId: simulation.id,
          id: asset.id,
        });

        const configJson = JSON.parse(new TextDecoder('utf-8').decode(configRes));

        setSimConfig(configJson);
        setSimulationPlot(Object.keys(configJson.simulation)[0]);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchPayload();
  }, [simulation, projectId, virtualLabId]);

  if (loadingConfig) {
    return (
      <div className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-3">
        <Spin indicator={<LoadingOutlined />} size="large" />
        <h2 className="text-primary-9 font-light">Loading simulation {index + 1}...</h2>
      </div>
    );
  }

  if (!simConfig) return null;

  return (
    <div className="flex items-start gap-8 border p-8">
      <div className="text-primary-8 flex flex-[0_1_60%] flex-col gap-10">
        <NameDescription name={simulation.name} description={simulation.description} />
        <Params payload={simConfig} />
        <div className="flex w-full flex-col gap-2">
          <div className="text-primary-8 text-lg font-bold">Injection location</div>
          <div className="mt-2 flex max-w-max items-center justify-center border border-gray-100 px-5 py-1 font-bold">
            {simConfig.config.current_injection.inject_to}
          </div>
        </div>
        <div className="flex w-full flex-col gap-2">
          <div className="text-primary-8 text-lg font-bold">Recording locations</div>
          <div className="mt-2 flex items-center gap-4">
            {simConfig.config.record_from.map((r, ind) => (
              <div key={`${r.section}_${r.offset}`} className="flex flex-col gap-1">
                <div className="text-gray-400 uppercase">Recording {ind + 1}</div>
                <div className="flex max-w-max items-center justify-start gap-3 border border-gray-100 px-5 py-1">
                  <span className="text-primary-8 text-base font-bold capitalize">{r.section}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm uppercase">offset</span>
                    <CustomPopover
                      message="The recording position relative to the section. 0 being the start of the section and 1 being the end."
                      placement="bottomRight"
                      when={['hover']}
                    >
                      <InfoCircleOutlined className="cursor-pointer" />
                    </CustomPopover>
                    <span className="text-primary-8 py-1 text-base font-bold">{r.offset}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full flex-[1_1_40%] flex-col items-end justify-center gap-5">
        {simConfig.stimulus && (
          <div className="flex w-full flex-col">
            <div className="text-primary-8 mb-4 text-2xl font-bold">Stimulus</div>
            <SimulationPlotAsImage yTitle="Current [nA]" plotData={simConfig.stimulus} />
          </div>
        )}

        {simConfig.simulation && (
          <div className="flex w-full flex-col">
            <div className="text-primary-8 mb-4 text-2xl font-bold">Recording</div>
            <ConfigProvider theme={{ hashed: false }}>
              <Segmented
                defaultValue="center"
                className={classNames(
                  'mb-4 max-w-max',
                  'bg-white [&_.ant-segmented-group]:gap-2',
                  '[&_.ant-segmented-item]:border [&_.ant-segmented-item]:border-gray-400 [&_.ant-segmented-item]:bg-white',
                  '[&_.ant-segmented-item-selected]:border-primary-8! [&_.ant-segmented-item-selected]:bg-primary-8! [&_.ant-segmented-item-selected]:text-white [&_.ant-segmented-item-selected]:shadow-md!'
                )}
                onChange={(value) => setSimulationPlot(value)}
                value={simulationPlot}
                options={Object.entries(simConfig.simulation).map(([key]) => ({
                  label: key,
                  value: key,
                }))}
              />
            </ConfigProvider>
            {simulationPlot && (
              <SimulationPlotAsImage plotData={get(simConfig.simulation, simulationPlot)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NameDescription({ name, description }: { name: string; description: string }) {
  return (
    <div className="">
      <div className={subtitleStyle}>Name</div>
      <div className="text-2xl font-bold">{name}</div>
      <p className="">{description}</p>
    </div>
  );
}

function Params({ payload }: { payload: SimulationPayload | null }) {
  if (!payload) return null;

  return (
    <div className="flex justify-between gap-10">
      <div>
        <div className={subtitleStyle}>Temperature</div>
        <div>
          <span className="font-bold">{payload.config.conditions.celsius}</span>
          <span>&nbsp;°C</span>
        </div>
      </div>

      <div>
        <div className={subtitleStyle}>Time step</div>
        <div>
          <span className="font-bold">0.01</span>
          <span>&nbsp;ms</span>
        </div>
      </div>

      <div>
        <div className={subtitleStyle}>Initial voltage</div>
        <div>
          <span className="font-bold">{payload.config.conditions.vinit}</span>
          <span>&nbsp;mV</span>
        </div>
      </div>

      <div>
        <div className={subtitleStyle}>Holding current</div>
        <div>
          <span className="font-bold">{payload.config.conditions.hypamp}</span>
          <span>&nbsp;nA</span>
        </div>
      </div>
    </div>
  );
}
