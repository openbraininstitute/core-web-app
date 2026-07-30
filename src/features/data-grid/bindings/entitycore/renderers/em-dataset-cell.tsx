'use client';

import { useQuery } from '@tanstack/react-query';

import { getEmDenseReconstructionDataset } from '@/api/entitycore/queries/general/em-dense-reconstruction-dataset';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Skeleton } from '@/ui/molecules/skeleton';
import { keyBuilder } from '@/ui/use-query-keys/data';

import { EMPTY_PLACEHOLDER } from '../columns/catalog';

import type { CellRendererProps } from '../../../react';
import type { HasEmDataset } from '../columns/catalog';

/** Cell-renderer registry key for the EM dense-reconstruction dataset name cell. */
export const EM_DATASET_RENDERER = 'emDataset';

/**
 * EM-cell-mesh list rows carry only the dataset's `{ id }`, not its name, so the name
 * is fetched lazily per cell. Keyed by dataset id, rows sharing a dataset (the common
 * case — a few datasets back many meshes) dedupe to one request via react-query; the
 * result is treated as immutable (`staleTime`/`gcTime: Infinity`) since dataset names
 * don't change within a session.
 */
export function EmDatasetCell({ row }: CellRendererProps<HasEmDataset>) {
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

  if (!datasetId) return <span className="text-gray-300">{EMPTY_PLACEHOLDER}</span>;
  if (isLoading) return <Skeleton className="h-4 w-24" />;
  // min-w-0 lets the span shrink-and-ellipsize inside the flex cell wrapper
  return <span className="min-w-0 truncate text-primary-8">{data?.name ?? EMPTY_PLACEHOLDER}</span>;
}
