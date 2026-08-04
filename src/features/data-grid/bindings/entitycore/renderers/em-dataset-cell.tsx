'use client';

import { useQuery } from '@tanstack/react-query';

import { getEmDenseReconstructionDataset } from '@/api/entitycore/queries/general/em-dense-reconstruction-dataset';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Skeleton } from '@/ui/molecules/skeleton';
import { keyBuilder } from '@/ui/use-query-keys/data';

import { EMPTY_PLACEHOLDER, formatDate } from '../columns/catalog';

import type { ICellRendererProps } from '../../../react';
import type { IHasEmDataset } from '../columns/catalog';

/** Cell-renderer registry key for the EM dense-reconstruction dataset name cell. */
export const EM_DATASET_RENDERER = 'emDataset';
/** …and for the two ScientificArtifact fields of that same dataset. */
export const EM_DATASET_PUBLISHED_IN_RENDERER = 'emDatasetPublishedIn';
export const EM_DATASET_EXPERIMENT_DATE_RENDERER = 'emDatasetExperimentDate';

/**
 * The dataset fields the mesh list row does NOT carry. `EMDenseReconstructionDataset`
 * is a ScientificArtifact, so `published_in` and `experiment_date` are on its own read
 * schema — they are simply absent from the hand-written TS type.
 */
type TDatasetFields = {
  name?: string | null;
  published_in?: string | null;
  experiment_date?: string | null;
};

/**
 * EM-cell-mesh list rows carry only the dataset's `{ id }` — `em_cell_mesh.py`
 * serializes it as a `BasicEntityRead`, which is id + type and nothing else — so every
 * dataset field is fetched lazily per cell. Keyed by dataset id, rows sharing a dataset
 * (the common case — a few datasets back many meshes) dedupe to ONE request via
 * react-query, and the three cells below share that same request rather than each
 * making their own. The result is treated as immutable
 * (`staleTime`/`gcTime: Infinity`): a dataset's publication details do not change
 * within a session.
 */
function useEmDataset(row?: IHasEmDataset) {
  const datasetId = row?.em_dense_reconstruction_dataset?.id ?? '';
  const { virtualLabId, projectId } = useWorkspace();
  const context = { virtualLabId, projectId };

  const { data, isLoading } = useQuery({
    queryKey: keyBuilder.emDenseReconstructionDataset({ id: datasetId, context }),
    queryFn: () => getEmDenseReconstructionDataset({ id: datasetId, context }),
    enabled: Boolean(datasetId),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  return { datasetId, dataset: data as TDatasetFields | undefined, isLoading };
}

/** One rendering for all three cells, so loading/empty look the same in each. */
function DatasetField({ row, read }: { row?: IHasEmDataset; read: (d: TDatasetFields) => string }) {
  const { datasetId, dataset, isLoading } = useEmDataset(row);

  if (!datasetId) return <span className="text-gray-300">{EMPTY_PLACEHOLDER}</span>;
  if (isLoading) return <Skeleton className="h-4 w-24" />;
  const value = dataset ? read(dataset) : '';
  // min-w-0 lets the span shrink-and-ellipsize inside the flex cell wrapper
  return <span className="min-w-0 truncate text-primary-8">{value || EMPTY_PLACEHOLDER}</span>;
}

export function EmDatasetCell({ row }: ICellRendererProps<IHasEmDataset>) {
  return <DatasetField row={row} read={(d) => d.name ?? ''} />;
}

export function EmDatasetPublishedInCell({ row }: ICellRendererProps<IHasEmDataset>) {
  return <DatasetField row={row} read={(d) => d.published_in ?? ''} />;
}

export function EmDatasetExperimentDateCell({ row }: ICellRendererProps<IHasEmDataset>) {
  return <DatasetField row={row} read={(d) => formatDate(d.experiment_date)} />;
}
