import { InfoCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { ConfigProvider, Segmented, Spin } from 'antd';
import type { SegmentedValue } from 'antd/lib/segmented';
import get from 'es-toolkit/compat/get';
import some from 'es-toolkit/compat/some';
import startsWith from 'es-toolkit/compat/startsWith';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import type {
  ISingleNeuronSimulation,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';
import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import { getAssetElement } from '@/api/entitycore/utils';
import { tryCatch } from '@/api/utils';
import { getEntityByCoreType } from '@/entity-configuration/domain/helpers';
import { CustomPopover } from '@/features/entities/neuron-simulation/experiment/elements/popover';
import SimulationPlot from '@/features/entities/neuron-simulation/simulation-results/simulation-plot-dynamic';
import type { WorkspaceContext } from '@/types/common';
import type {
  SimulationPayload,
  SingleNeuronModelSimulationConfig,
} from '@/types/small-scale-simulator/single-neuron';
import { ButtonCopyId } from '@/ui/molecules/button-copy-id';
import { classNames } from '@/util/utils';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

const subtitleStyle = 'font-thin text-neutral-4';
type GenericSimulation = ISingleNeuronSynaptomeSimulation | ISingleNeuronSimulation;

type Props<T> = {
  index: number;
  type: TEntityTypeDict;
  simulation: T;
  children?: ({ config }: { config: SingleNeuronModelSimulationConfig }) => ReactNode;
};

export default function SimulationDetail<T extends GenericSimulation>({
  index,
  type,
  simulation,
  children,
}: Props<T>) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const [configAsset, setConfigAsset] = useState<SimulationPayload | null>(null);
  const [simulationPlot, setSimulationPlot] = useState<SegmentedValue | undefined>(undefined);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const simulationEntity = getEntityByCoreType({ type: simulation.type });
  const detailsPageUrl = simulationEntity
    ? resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        dataType: simulationEntity.extendedType,
        entityId: simulation.id,
      })
    : '';

  useEffect(() => {
    async function getConfigurationAsset() {
      setLoadingConfig(true);
      const entity = getEntityByCoreType({
        type,
      });
      if (entity) {
        const asset = getAssetElement({
          assets: simulation.assets,
          filter: (s) =>
            s.label === entity?.asset.configfile ||
            some(['simulation-config'], (prefix) => startsWith(s.path, prefix)),
        });
        if (asset) {
          const { data: assetResult, error: returnedError } = await tryCatch(
            downloadAsset({
              ctx: { virtualLabId, projectId },
              entityId: simulation.id,
              entityType: entity?.type,
              id: asset?.id,
              asRawResponse: true,
            }),
          );

          if (returnedError) setError(returnedError);
          const config = (await assetResult?.json()) as SimulationPayload;
          if (config) {
            setConfigAsset(config);
            setSimulationPlot(Object.keys(config.simulation).at(0));
          }
        }
      }
      setLoadingConfig(false);
    }

    getConfigurationAsset();
  }, [simulation, projectId, type, virtualLabId]);

  if (loadingConfig) {
    return (
      <div className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-3">
        <Spin indicator={<LoadingOutlined />} size="large" />
        <h2 className="text-primary-9 font-light">Loading experiment results {index + 1}...</h2>
      </div>
    );
  }

  if (!configAsset) return null;
  if (error) {
    return (
      <div className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-3">
        <Spin indicator={<InfoCircleOutlined />} size="large" />
        <h2 className="text-primary-9 font-light">Loading experiment data failed.</h2>
      </div>
    );
  }

  return (
    <div className="@container">
      <div className="border-neutral-2 grid gap-20 border p-8 @max-xs:grid-cols-1 @6xl:grid-cols-2">
        <div className="text-primary-8 flex flex-[0_1_60%] flex-col gap-10">
          <NameDescription
            name={simulation.name}
            description={simulation.description}
            detailsPageUrl={detailsPageUrl}
          />
          <Params payload={configAsset} />
          <div className="flex w-full flex-col gap-2">
            <div className="text-primary-8 text-lg font-bold">Injection location</div>
            <div className="mt-2 flex max-w-max flex-wrap items-center justify-center border border-gray-100 px-5 py-1 font-bold">
              {configAsset.config.current_injection.inject_to}
            </div>
          </div>
          <div className="flex w-full flex-col gap-2">
            <div className="text-primary-8 text-lg font-bold">Recording locations</div>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              {configAsset.config.record_from.map((r, ind) => (
                <div key={`${r.section}_${r.offset}`} className="flex flex-col gap-1">
                  <div className="text-gray-400 uppercase">Recording {ind + 1}</div>
                  <div className="flex max-w-max items-center justify-start gap-3 border border-gray-100 px-5 py-1">
                    <span className="text-primary-8 text-base font-bold capitalize">
                      {r.section}
                    </span>
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
          {children?.({ config: configAsset.config })}
        </div>

        <div className="flex w-full flex-col items-end justify-start gap-10">
          {configAsset.stimulus && (
            <div className="flex w-full flex-col">
              <div className="text-primary-8 mb-4 text-2xl font-bold">Stimulus</div>
              <SimulationPlot yTitle="Current [nA]" plotData={configAsset.stimulus} />
            </div>
          )}

          {configAsset.simulation && (
            <div className="flex w-full flex-col">
              <div className="flex justify-between">
                <div className="text-primary-8 mb-4 text-2xl font-bold">Recording</div>
                <ButtonCopyId label="Copy simulation ID" value={simulation.id} />
              </div>
              <ConfigProvider theme={{ hashed: false }}>
                <Segmented
                  defaultValue="center"
                  className={classNames(
                    'mb-4 max-w-max',
                    'bg-white [&_.ant-segmented-group]:flex [&_.ant-segmented-group]:flex-wrap [&_.ant-segmented-group]:gap-2',
                    '[&_.ant-segmented-item]:border [&_.ant-segmented-item]:border-gray-400 [&_.ant-segmented-item]:bg-white',
                    '[&_.ant-segmented-item-selected]:border-primary-8! [&_.ant-segmented-item-selected]:bg-primary-8! [&_.ant-segmented-item-selected]:text-white [&_.ant-segmented-item-selected]:shadow-md!',
                  )}
                  onChange={(value) => setSimulationPlot(value)}
                  value={simulationPlot}
                  options={Object.entries(configAsset.simulation).map(([key]) => ({
                    label: key,
                    value: key,
                  }))}
                />
              </ConfigProvider>
              {simulationPlot && (
                <SimulationPlot
                  plotData={get(configAsset.simulation, simulationPlot)}
                  // TODO: remove the key, make the plot component re-render on data change.
                  key={simulationPlot}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NameDescription({
  name,
  description,
  detailsPageUrl,
}: {
  name: string;
  description: string;
  detailsPageUrl: string;
}) {
  return (
    <div className="">
      <div className={subtitleStyle}>Name</div>
      <div className="text-2xl font-bold">
        <Link href={detailsPageUrl}>{name}</Link>
      </div>
      <p className="">{description}</p>
    </div>
  );
}

function Params({ payload }: { payload: SimulationPayload | null }) {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-between gap-10">
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
