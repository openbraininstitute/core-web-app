import { useQuery } from '@tanstack/react-query';
import { includes } from 'es-toolkit/compat';
import { useMemo } from 'react';

import { getCellMorphology } from '@/api/entitycore/queries/experimental/cell-morphology';
import {
  ActivityStatus,
  type TActivityStatus,
} from '@/api/entitycore/types/entities/task-activity';
import { IoLayout } from '@/features/scan-config/components/shared/io-layout';
import { TaskIOFileItem } from '@/features/scan-config/components/shared/task-io-file-item';
import { useAutoSelectFileOnConfigChange } from '@/features/scan-config/components/shared/use-auto-select';
import { ActivityCustomFileRenderer, type TActivityCustomFile } from '@/features/scan-config/types';

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

export function InOutFiles({
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

  const outputFiles: TActivityCustomFile[] = useMemo(() => {
    return (morphologies ?? [])
      .map((morphology) => {
        const swcAsset = morphology.assets.find((a) => a.content_type === 'application/swc');
        if (!swcAsset) return null;
        return {
          entity: morphology,
          asset: swcAsset,
          name: morphology.name,
          renderer: ActivityCustomFileRenderer.MiniDetailView,
        } as TActivityCustomFile;
      })
      .filter((file): file is TActivityCustomFile => file !== null);
  }, [morphologies]);

  useAutoSelectFileOnConfigChange({
    configId: config.id,
    selectedFile,
    inputFiles,
    outputFiles,
    onSelect,
  });

  return (
    <IoLayout
      inputTitle="Input files"
      outputTitle="Output files"
      showOutput={outputAvailable}
      inputIsEmpty={inputFiles.length === 0}
      outputIsEmpty={!morphologies?.length && !isLoading}
      inputItems={inputFiles.map((file) => (
        <TaskIOFileItem
          selected={file.asset.id === selectedFile?.asset.id}
          key={file.asset?.id}
          file={file}
          onSelect={onSelect}
          name={file.name}
        />
      ))}
      outputItems={outputFiles.map((file) => (
        <TaskIOFileItem
          selected={file.entity.id === selectedFile?.entity.id}
          key={file.entity.id}
          file={file}
          name="Skeletonized morphology"
          onSelect={onSelect}
        />
      ))}
    />
  );
}
