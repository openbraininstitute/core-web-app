import { useQuery } from '@tanstack/react-query';
import { includes } from 'es-toolkit/compat';
import { useEffect, useMemo } from 'react';

import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { ActivityExecutionStatus } from '@/api/entitycore/types/entities/execution';
import { AssetLabel, type IAsset } from '@/api/entitycore/types/shared/global';
import { useModelQuery } from '@/features/scan-config/components/atoms/index';
import { ActivityCustomFileRenderer, type TActivityCustomFile } from '@/features/scan-config/types';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { classNames } from '@/util/utils';

import type { ICircuitExtractionConfig } from '@/api/entitycore/types/entities/circuit-extraction-config';
import type { ICircuitExtractionExecution } from '@/api/entitycore/types/entities/circuit-extraction-execution';
import type { TActivityExecutionStatus } from '@/api/entitycore/types/entities/execution';

type Props = {
  config: ICircuitExtractionConfig;
  execStatus?: TActivityExecutionStatus;
  execution?: ICircuitExtractionExecution;
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
  const { entity: circuit } = useModelQuery({ id: config.circuit_id, context });
  const extractionConfigAsset = config.assets.find(
    (o) => o.label === AssetLabel.circuit_extraction_config
  );
  const circuitAssets = circuit && 'assets' in circuit ? circuit.assets : [];
  const circuitConfigAsset = circuitAssets?.find(
    (o: IAsset) => o.label === AssetLabel.sonata_circuit
  );

  const inputFiles: TActivityCustomFile[] = useMemo(() => {
    const files: TActivityCustomFile[] = [];
    if (extractionConfigAsset) {
      files.push({
        entity: config,
        asset: extractionConfigAsset,
        renderer: ActivityCustomFileRenderer.Default,
      });
    }
    if (circuit && circuitConfigAsset) {
      files.push({
        entity: circuit,
        asset: circuitConfigAsset,
        assetPath: 'circuit_config.json',
        renderer: ActivityCustomFileRenderer.Default,
      });
    }
    return files;
  }, [config, circuit, circuitConfigAsset, extractionConfigAsset]);

  const outputAvailable =
    !!execStatus &&
    includes([ActivityExecutionStatus.ERROR, ActivityExecutionStatus.DONE], execStatus);

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
      <h4 className="uppercase">Input files</h4>
      <div className="mt-4 mb-8 flex flex-col gap-4">
        {inputFiles.length === 0 && <div className="text-gray-400">No input files available</div>}
        {inputFiles.map((file) => (
          <ExtractionResultItem
            selected={file.asset.id === selectedFile?.asset.id}
            key={file.asset?.id}
            file={file}
            onSelect={onSelect}
            name={file.name}
          />
        ))}
      </div>

      {outputAvailable && (
        <>
          <h4 className="uppercase">Output files</h4>
          <div className="mt-4 flex flex-col gap-4">
            {!extractedCircuit && !isLoading && (
              <div className="text-gray-400">No output files generated</div>
            )}
            {extractedCircuit && (
              <ExtractionResultItem
                selected={extractedCircuit?.id === selectedFile?.entity.id}
                key={extractedCircuit.id}
                file={{
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
  name?: string;
  file: TActivityCustomFile;
  selected?: boolean;
  onSelect: (file: TActivityCustomFile) => void;
};

function ExtractionResultItem({ name, file, selected, onSelect }: TExtractionResultItemProps) {
  const fileName = file.assetPath?.split('/').at(-1) ?? file.asset.path.split('/').at(-1);
  const fileExt = fileName?.split('.').at(-1);
  const displayName = name ?? fileName;

  return (
    <button
      type="button"
      title={displayName}
      className={classNames(
        'flex w-full cursor-pointer items-center justify-between rounded-4xl p-4',
        selected ? 'bg-[linear-gradient(95.07deg,#003A8C_42.23%,#001026_109.71%)]' : 'bg-white'
      )}
      onClick={() => onSelect(file)}
    >
      <span
        className={classNames(
          'truncate overflow-hidden font-semibold whitespace-nowrap',
          selected ? 'text-white' : 'text-primary-9'
        )}
      >
        {displayName}
      </span>
      {!name && (
        <span
          className={classNames(
            'ml-4 shrink-0 rounded-2xl border px-4 uppercase',
            selected ? 'border-white text-white' : 'text-neutral-5 border-neutral-5'
          )}
        >
          {fileExt}
        </span>
      )}
    </button>
  );
}
