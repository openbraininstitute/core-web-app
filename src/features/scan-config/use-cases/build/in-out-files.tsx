import { useQuery } from '@tanstack/react-query';
import { includes } from 'es-toolkit/compat';
import { useEffect, useMemo } from 'react';

import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { ActivityStatus, type TActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetContentType, AssetLabel, type IAsset } from '@/api/entitycore/types/shared/global';
import { useModelQuery } from '@/features/scan-config/components/atoms';
import {
  ScanConfigCampaignOriginActionDict,
  type TScanConfigCampaignOriginActionDict,
} from '@/features/scan-config/helpers';
import { ActivityCustomFileRenderer, type TActivityCustomFile } from '@/features/scan-config/types';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { classNames } from '@/util/utils';

import type { ReactNode } from 'react';
import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';

type Props = {
  config: ITaskConfig<never>;
  execStatus?: TActivityStatus;
  execution?: ITaskActivity;
  selectedFile?: TActivityCustomFile;
  onSelect: (file: TActivityCustomFile) => void;
  logsActive: boolean;
  onSelectLogs: () => void;
  context: { virtualLabId: string; projectId: string };
  campaignOrigin: TScanConfigCampaignOriginActionDict;
};

export function InOutFiles({
  config,
  execStatus,
  execution,
  selectedFile,
  onSelect,
  logsActive,
  onSelectLogs,
  context,
  campaignOrigin,
}: Props) {
  const { entity: circuit } = useModelQuery({ id: execution?.generated.at(0)?.id, context });
  const configAsset = config.assets.find((o) => o.label === AssetLabel.task_config);
  const circuitAssets = circuit && 'assets' in circuit ? circuit.assets : [];
  const circuitConfigAsset = circuitAssets?.find(
    (o: IAsset) => o.label === AssetLabel.sonata_circuit
  );

  const inputFiles: TActivityCustomFile[] = useMemo(() => {
    const files: TActivityCustomFile[] = [];
    if (configAsset) {
      files.push({
        id: configAsset.id,
        entity: config,
        asset: configAsset,
        renderer: ActivityCustomFileRenderer.Default,
      });
    }
    if (circuit && circuitConfigAsset) {
      files.push({
        id: circuitConfigAsset.id,
        entity: circuit,
        asset: circuitConfigAsset,
        assetPath: 'circuit_config.json',
        enforcedRenderType: AssetContentType.json,
        renderer: ActivityCustomFileRenderer.Default,
      });
    }
    return files;
  }, [config, circuit, circuitConfigAsset, configAsset]);

  const outputAvailable =
    !!execStatus && includes([ActivityStatus.ERROR, ActivityStatus.DONE], execStatus);

  const builtCircuitId = execution?.generated?.[0]?.id;
  const { data: builtCircuit, isLoading } = useQuery({
    queryKey: keyBuilder.oneCircuit({
      virtualLabId: context.virtualLabId,
      projectId: context.projectId,
      entityId: builtCircuitId ?? '',
    }),
    // biome-ignore lint/style/noNonNullAssertion: the function is enable only if builtCircuitId is present (see useQuery/enabled)
    queryFn: () => getCircuit({ id: builtCircuitId!, context }),
    enabled: !!builtCircuitId,
    // the refetch is required as the built circuit upload to s3 will not be ready immediately
    refetchInterval(query) {
      if (campaignOrigin === ScanConfigCampaignOriginActionDict.View) {
        return false;
      }
      const data = query.state.data;
      const hasVisAsset = data?.assets?.some(
        (asset) => asset.label === AssetLabel.circuit_visualization
      );
      const retry = hasVisAsset ? false : 2_000;
      return retry;
    },
  });

  useEffect(() => {
    if (logsActive) return;
    if (inputFiles.length > 0 && !selectedFile) {
      onSelect(inputFiles[0]);
    }
  }, [inputFiles, logsActive, selectedFile, onSelect]);

  return (
    <div className="h-full overflow-y-auto">
      <h4 className="uppercase">Inputs</h4>
      <div className="mt-4 mb-8 flex flex-col gap-4">
        {inputFiles.length === 0 && <div className="text-gray-400">No input files available</div>}
        {inputFiles.map((file) => {
          return (
            <ResultItem
              id={file.asset.id}
              selected={!logsActive && file.asset.id === selectedFile?.id}
              key={file.asset?.id}
              file={file}
              onSelect={onSelect}
              name={file.name}
            />
          );
        })}
      </div>

      <h4 className="uppercase">Outputs</h4>
      <div className="mt-4 flex flex-col gap-4">
        <button
          id={`logs-${config.id}`}
          type="button"
          title="Logs"
          className={classNames(
            'flex w-full cursor-pointer items-center justify-between rounded-4xl p-4',
            logsActive
              ? 'bg-[linear-gradient(95.07deg,#003A8C_42.23%,#001026_109.71%)]'
              : 'bg-white'
          )}
          onClick={onSelectLogs}
        >
          <div
            className={classNames(
              'truncate overflow-hidden font-semibold whitespace-nowrap text-left',
              logsActive ? 'text-white' : 'text-primary-9'
            )}
          >
            <div>Task logs</div>
          </div>
          <span
            className={classNames(
              'ml-4 shrink-0 rounded-2xl border px-4 uppercase',
              logsActive ? 'border-white text-white' : 'text-neutral-5 border-neutral-5'
            )}
          >
            log
          </span>
        </button>

        {outputAvailable && !builtCircuit && !isLoading && (
          <div className="text-gray-400">No output files generated</div>
        )}
        {outputAvailable && builtCircuit && (
          <ResultItem
            id={builtCircuit.id}
            label={<small className="uppercase">Circuit</small>}
            selected={!logsActive && builtCircuit?.id === selectedFile?.id}
            key={builtCircuit.id}
            file={{
              id: builtCircuit.id,
              entity: builtCircuit,
              asset: builtCircuit.assets[0],
              name: builtCircuit.name,
              renderer: ActivityCustomFileRenderer.MiniDetailView,
            }}
            name={builtCircuit.name}
            onSelect={onSelect}
          />
        )}
      </div>
    </div>
  );
}

type TResultItemProps = {
  id: string;
  label?: ReactNode;
  name?: string;
  file: TActivityCustomFile;
  selected?: boolean;
  onSelect: (file: TActivityCustomFile) => void;
};

function ResultItem({ id, label, name, file, selected, onSelect }: TResultItemProps) {
  const fileName = file.assetPath?.split('/').at(-1) ?? file.asset.path.split('/').at(-1);
  const fileExt = label ?? fileName?.split('.').at(-1);
  const displayName = name ?? fileName;
  return (
    <button
      id={id}
      type="button"
      title={displayName}
      className={classNames(
        'flex w-full cursor-pointer items-center justify-between rounded-4xl p-4',
        selected ? 'bg-[linear-gradient(95.07deg,#003A8C_42.23%,#001026_109.71%)]' : 'bg-white'
      )}
      onClick={() => onSelect(file)}
    >
      <div
        className={classNames(
          'truncate overflow-hidden font-semibold whitespace-nowrap text-left',
          selected ? 'text-white' : 'text-primary-9'
        )}
      >
        <div>{displayName}</div>
      </div>
      <span
        className={classNames(
          'ml-4 shrink-0 rounded-2xl border px-4 uppercase',
          selected ? 'border-white text-white' : 'text-neutral-5 border-neutral-5'
        )}
      >
        {fileExt}
      </span>
    </button>
  );
}
