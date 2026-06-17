'use client';

import { useQuery } from '@tanstack/react-query';

import { getEmDenseReconstructionDataset } from '@/api/entitycore/queries/general/em-dense-reconstruction-dataset';
import { EmptyValue } from '@/entity-configuration/definitions/empty-value';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

/**
 * Renders the name of an EM dense reconstruction dataset, fetched by id.
 *
 * The EM-cell-mesh list response only carries the dataset's `{ id, type }`, not its name, so the
 * name is fetched lazily per cell. The query key is keyed by dataset id, so rows sharing a dataset
 * (the common case — few datasets back many meshes) dedupe to a single request via react-query.
 */
export function DatasetNameCell({ datasetId }: { datasetId?: string }) {
  const { virtualLabId, projectId } = useWorkspace();
  const context = { virtualLabId, projectId };

  const { data, isLoading } = useQuery({
    queryKey: keyBuilder.emDenseReconstructionDataset({ id: datasetId ?? '', context }),
    queryFn: () => getEmDenseReconstructionDataset({ id: datasetId ?? '', context }),
    enabled: Boolean(datasetId),
  });

  if (!datasetId) return <>{EmptyValue}</>;
  return <>{isLoading ? '…' : (data?.name ?? EmptyValue)}</>;
}
