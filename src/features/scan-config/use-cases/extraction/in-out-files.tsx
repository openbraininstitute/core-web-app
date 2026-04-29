import { useQuery } from '@tanstack/react-query';
import { includes } from 'es-toolkit/compat';
import { type ReactNode, useEffect, useMemo } from 'react';

import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { ActivityStatus, type TActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetContentType, AssetLabel, type IAsset } from '@/api/entitycore/types/shared/global';
import { useModelQuery } from '@/features/scan-config/components/atoms';
import { ActivityCustomFileRenderer, type TActivityCustomFile } from '@/features/scan-config/types';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { classNames } from '@/util/utils';

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { TTaskConfigMeta } from '@/entity-configuration/domain/extraction/extraction-campaign';

type Props = {
  config: ITaskConfig<TTaskConfigMeta>;
  execStatus?: TActivityStatus;
  execution?: ITaskActivity;
  selectedFile?: TActivityCustomFile;
  onSelect: (file: TActivityCustomFile) => void;
  context: { virtualLabId: string; projectId: string };
};

export function ExtractionInOutFiles({
  config,
  execStatus,
  execution,
  selectedFile,
  onSelect,
  context,
}: Props) {
  const { entity: circuit } = useModelQuery({ id: execution?.generated.at(0)?.id, context });
  const extractionConfigAsset = config.assets.find((o) => o.label === AssetLabel.task_config);
  const circuitAssets = circuit && 'assets' in circuit ? circuit.assets : [];
  const circuitConfigAsset = circuitAssets?.find(
    (o: IAsset) => o.label === AssetLabel.sonata_circuit
  );

  const inputFiles: TActivityCustomFile[] = useMemo(() => {
    const files: TActivityCustomFile[] = [];
    if (extractionConfigAsset) {
      files.push({
        id: extractionConfigAsset.id,
        entity: config,
        asset: extractionConfigAsset,
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
  }, [config, circuit, circuitConfigAsset, extractionConfigAsset]);

  const outputAvailable =
    !!execStatus && includes([ActivityStatus.ERROR, ActivityStatus.DONE], execStatus);

  const extractedCircuitId = execution?.generated?.[0]?.id;
  const { data: extractedCircuit, isLoading } = useQuery({
    queryKey: keyBuilder.oneCircuit({
      virtualLabId: context.virtualLabId,
      projectId: context.projectId,
      entityId: extractedCircuitId ?? '',
    }),
    // biome-ignore lint/style/noNonNullAssertion: the function is enable only if extractedCircuitId is present (see useQuery/enabled)
    queryFn: () => getCircuit({ id: extractedCircuitId!, context }),
    enabled: !!extractedCircuitId,
    // the refetch is required as the extraction upload to s3 will not be ready immediately
    refetchInterval(query) {
      const data = query.state.data;
      const hasVisAsset = data?.assets?.some(
        (asset) => asset.label === AssetLabel.circuit_visualization
      );
      const retry = hasVisAsset ? false : 2_000;
      return retry;
    },
  });

  useEffect(() => {
    if (inputFiles.length > 0 && !selectedFile) {
      onSelect(inputFiles[0]);
    }
  }, [inputFiles, selectedFile, onSelect]);

  return (
    <div className="h-full overflow-y-auto">
      <h4 className="uppercase">Inputs</h4>
      <div className="mt-4 mb-8 flex flex-col gap-4">
        {inputFiles.length === 0 && <div className="text-gray-400">No input files available</div>}
        {inputFiles.map((file) => {
          return (
            <ExtractionResultItem
              id={file.asset.id}
              selected={file.asset.id === selectedFile?.id}
              key={file.asset?.id}
              file={file}
              onSelect={onSelect}
              name={file.name}
            />
          );
        })}
      </div>

      {outputAvailable && (
        <>
          <h4 className="uppercase">Outputs</h4>
          <div className="mt-4 flex flex-col gap-4">
            {!extractedCircuit && !isLoading && (
              <div className="text-gray-400">No output files generated</div>
            )}
            {extractedCircuit && (
              <ExtractionResultItem
                id={extractedCircuit.id}
                label={<small className="uppercase">Circuit</small>}
                selected={extractedCircuit?.id === selectedFile?.id}
                key={extractedCircuit.id}
                file={{
                  id: extractedCircuit.id,
                  entity: extractedCircuit,
                  asset: extractedCircuit.assets[0],
                  name: extractedCircuit.name,
                  renderer: ActivityCustomFileRenderer.MiniDetailView,
                }}
                name={extractedCircuit.name}
                onSelect={onSelect}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

type TExtractionResultItemProps = {
  id: string;
  label?: ReactNode;
  name?: string;
  file: TActivityCustomFile;
  selected?: boolean;
  onSelect: (file: TActivityCustomFile) => void;
};

function ExtractionResultItem({
  id,
  label,
  name,
  file,
  selected,
  onSelect,
}: TExtractionResultItemProps) {
  const fileName = file.assetPath?.split('/').at(-1) ?? file.asset.path.split('/').at(-1);
  const fileExt = label ?? fileName?.split('.').at(-1);
  const displayName = name ?? fileName;
  return (
    <button
      id={id}
      type="button"
      title={displayName}
      className={classNames(
        'group flex w-full cursor-pointer items-center justify-between rounded-4xl p-4',
        selected ? 'bg-[linear-gradient(95.07deg,#003A8C_42.23%,#001026_109.71%)]' : 'bg-white',
        'hover:bg-gray-100'
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
          'group-hover:bg-gray-200 group-hover:border-gray-100',
          'ml-4 shrink-0 rounded-full border px-4 uppercase text-xs py-1',
          selected ? 'border-white text-primary-9 bg-white' : 'text-neutral-5 border-neutral-5'
        )}
      >
        {fileExt}
      </span>
    </button>
  );
}
