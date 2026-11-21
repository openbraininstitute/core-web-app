import { useQuery } from '@tanstack/react-query';
import { includes } from 'es-toolkit/compat';
import { useMemo } from 'react';

import { getCellMorphology } from '@/api/entitycore/queries/experimental/cell-morphology';
import { getEmCellMesh } from '@/api/entitycore/queries/experimental/em-cell-mesh';
import {
  ActivityStatus,
  type TActivityStatus,
} from '@/api/entitycore/types/entities/task-activity';
import { IoLayout } from '@/features/scan-config/components/shared/io-layout';
import { TaskIOFileItem } from '@/features/scan-config/components/shared/task-io-file-item';
import { useAutoSelectFileOnConfigChange } from '@/features/scan-config/components/shared/use-auto-select';
import {
  ActivityCustomFileRenderer,
  type TActivityCustomFile,
  type TAssetBackedFile,
} from '@/features/scan-config/types';
import {
  makeLogStreamFileDescriptors,
  makeTaskConfigurationFile,
  makeTaskLogsFile,
  prependLogStreamFile,
} from '@/features/task-logs-stream/descriptor';

import {
  inputMeshId,
  SPINY_COMPARISON_NAME,
  spinyAsset,
  spinyComparisonFiles,
} from './spiny-output';

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
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
  const logStreamFiles = useMemo(
    () =>
      makeLogStreamFileDescriptors({
        configId: config.id,
        executionId: execution?.execution_id,
      }),
    [config.id, execution?.execution_id]
  );

  const inputFiles: TAssetBackedFile[] = useMemo(() => {
    const files: TAssetBackedFile[] = config.assets.map((asset) => ({
      entity: config,
      asset,
      renderer: ActivityCustomFileRenderer.Default,
    }));
    return prependLogStreamFile({
      file: logStreamFiles.input
        ? makeTaskConfigurationFile({ descriptor: logStreamFiles.input, config })
        : null,
      files,
    });
  }, [config, logStreamFiles.input]);

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

  // the mesh skeletonized, for a 3D view of the output on it, once there is a morphology with spines to show
  const meshId = inputMeshId(config);
  const hasSpines = (morphologies ?? []).some((m) => !!spinyAsset(m));
  const { data: mesh } = useQuery({
    queryKey: ['skeletonization-input-mesh', meshId],
    queryFn: () => getEmCellMesh({ id: meshId as string, context }),
    enabled: !!meshId && hasSpines,
  });

  const outputFiles: TActivityCustomFile[] = useMemo(() => {
    const files = (morphologies ?? []).map(
      (morphology) =>
        ({
          entity: morphology,
          name: morphology.name,
          dataType: morphology.type as TExtendedEntitiesTypeDict,
          renderer: ActivityCustomFileRenderer.MiniDetailView,
        }) as TActivityCustomFile
    );
    // the comparison first, which is what a finished run opens on
    return [
      ...spinyComparisonFiles(mesh, morphologies ?? []),
      ...prependLogStreamFile<TActivityCustomFile>({
        file:
          logStreamFiles.output && execution
            ? makeTaskLogsFile({ descriptor: logStreamFiles.output, execution })
            : null,
        files,
      }),
    ];
  }, [morphologies, mesh, execution, logStreamFiles.output]);

  useAutoSelectFileOnConfigChange({
    configId: config.id,
    selectedFile,
    inputFiles,
    outputFiles,
    onSelect,
  });

  return (
    <IoLayout
      showOutput={outputAvailable || logStreamFiles.showOutput}
      inputIsEmpty={inputFiles.length === 0}
      outputIsEmpty={outputFiles.length === 0 && !isLoading}
      inputItems={inputFiles.map((file) => (
        <TaskIOFileItem
          id={file.id ?? file.asset.id}
          selected={(file.id ?? file.asset.id) === selectedFile?.id}
          key={file.id ?? file.asset.id}
          file={file}
          onSelect={onSelect}
          name={file.name}
        />
      ))}
      outputItems={outputFiles.map((file) => (
        <TaskIOFileItem
          id={file.id ?? file.entity.id}
          selected={
            file.id ? file.id === selectedFile?.id : file.entity.id === selectedFile?.entity.id
          }
          key={file.id ?? file.entity.id}
          file={file}
          name={
            file.renderer === ActivityCustomFileRenderer.TaskLogsViewer
              ? file.name
              : file.renderer === ActivityCustomFileRenderer.SpinyComparison
                ? SPINY_COMPARISON_NAME
                : 'Skeletonized morphology'
          }
          label={file.renderer === ActivityCustomFileRenderer.SpinyComparison ? '3D' : undefined}
          interactive={file.renderer === ActivityCustomFileRenderer.SpinyComparison}
          onSelect={onSelect}
        />
      ))}
    />
  );
}
