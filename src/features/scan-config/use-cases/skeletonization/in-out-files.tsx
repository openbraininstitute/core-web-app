import { useQuery } from '@tanstack/react-query';
import { includes } from 'es-toolkit/compat';
import { useEffect, useMemo } from 'react';

import { getCellMorphology } from '@/api/entitycore/queries/experimental/cell-morphology';
import {
  ActivityStatus,
  type TActivityStatus,
} from '@/api/entitycore/types/entities/task-activity';
import { ActivityCustomFileRenderer, type TActivityCustomFile } from '@/features/scan-config/types';
import { classNames } from '@/util/utils';

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { TSkeletonizationTaskConfigMeta } from '@/entity-configuration/domain/processing/skeletonization-campaign';

type Props = {
  config: ITaskConfig<TSkeletonizationTaskConfigMeta>;
  execStatus?: TActivityStatus;
  execution?: ITaskActivity;
  selectedFile?: TActivityCustomFile;
  onSelect: (file: TActivityCustomFile) => void;
  context: { virtualLabId: string; projectId: string };
};

export function SkeletonizationInOutFiles({
  config,
  execStatus,
  execution,
  selectedFile,
  onSelect,
  context,
}: Props) {
  const inputFiles: TActivityCustomFile[] = useMemo(() => {
    return config.assets.map((asset) => ({
      entity: config,
      asset,
      renderer: ActivityCustomFileRenderer.Default,
    }));
  }, [config]);

  const outputAvailable =
    !!execStatus && includes([ActivityStatus.ERROR, ActivityStatus.DONE], execStatus);

  const generatedMorphologies = execution?.generated ?? [];
  const { data: morphologies, isLoading } = useQuery({
    queryKey: ['skeletonization-morphologies', generatedMorphologies.map((g) => g.id)],
    queryFn: async () => {
      const results = await Promise.all(
        generatedMorphologies.map((gen) =>
          getCellMorphology({ id: gen.id, context }).catch(() => null)
        )
      );
      return results.filter((r) => r !== null);
    },
    enabled: generatedMorphologies.length > 0,
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
          <FileItem
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
            {!morphologies?.length && !isLoading && (
              <div className="text-gray-400">No output files generated</div>
            )}
            {morphologies?.map((morphology) => {
              const swcAsset = morphology.assets.find((a) => a.content_type === 'application/swc');
              if (!swcAsset) return null;
              return (
                <FileItem
                  selected={morphology.id === selectedFile?.entity.id}
                  key={morphology.id}
                  file={{
                    entity: morphology,
                    asset: swcAsset,
                    name: morphology.name,
                    renderer: ActivityCustomFileRenderer.MiniDetailView,
                  }}
                  name={morphology.name}
                  onSelect={onSelect}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

type FileItemProps = {
  name?: string;
  file: TActivityCustomFile;
  selected?: boolean;
  onSelect: (file: TActivityCustomFile) => void;
};

function FileItem({ name, file, selected, onSelect }: FileItemProps) {
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
