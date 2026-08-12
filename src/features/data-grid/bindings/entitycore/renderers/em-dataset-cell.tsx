'use client';

import { useQuery } from '@tanstack/react-query';

import { getEmDenseReconstructionDataset } from '@/api/entitycore/queries/general/em-dense-reconstruction-dataset';
import { formatDate } from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { EMPTY_PLACEHOLDER } from '@/features/data-grid/renderers/aggrid/empty-cell';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Skeleton } from '@/ui/molecules/skeleton';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { IHasEmDataset } from '@/features/data-grid/bindings/entitycore/columns/catalog';
import type { ICellRendererProps } from '@/features/data-grid/react';

/** Cell-renderer registry key for the EM dense-reconstruction dataset name cell. */
export const EM_DATASET_RENDERER = 'emDataset';
/** Registry keys for the two ScientificArtifact fields of that same dataset. */
export const EM_DATASET_PUBLISHED_IN_RENDERER = 'emDatasetPublishedIn';
export const EM_DATASET_EXPERIMENT_DATE_RENDERER = 'emDatasetExperimentDate';

/** Dataset fields absent from the hand-written TS type but present on the wire. */
type TDatasetFields = {
  name?: string | null;
  published_in?: string | null;
  experiment_date?: string | null;
};

/**
 * Mesh rows carry only the dataset's `{ id }`, so dataset fields are fetched lazily.
 * Keyed by dataset id so rows (and all three cells) sharing a dataset dedupe to one
 * request, cached forever — publication details don't change within a session.
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
