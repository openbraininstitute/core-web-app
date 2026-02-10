'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import {
  getSpeciesConfigByHierarchyId,
  usePrimaryHierarchyOfCurrentSpeciesQuery,
} from '@/features/brain-region-hierarchy/context';
import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';
import { useCurrentExplorerArtifactValue } from '@/state/explore-section/artifact';

export interface Snapshot {
  isRootRegion: boolean;
  regionId: string;
  regionTitle: string;
  artifact: string;
  frontendUrl: string;
}

export function useSnapshot(): Snapshot {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedBrainRegion, workspaceHierarchyId } = useWorkspaceHierarchyRegistry();
  const config = getSpeciesConfigByHierarchyId(workspaceHierarchyId);
  const isRootRegion =
    `${selectedBrainRegion?.annotation_value}` === config.PrimaryDivisionAnnotationValue;

  const { result } = usePrimaryHierarchyOfCurrentSpeciesQuery();

  const regionId = selectedBrainRegion?.id ?? '';
  const node = (result?.options ?? []).find((o) => o.data.id === selectedBrainRegion?.id);
  const regionTitle = node?.label ?? '';
  const artifact = useCurrentExplorerArtifactValue();
  const search = searchParams.toString();
  const frontendUrl = search ? `${pathname}?${search}` : pathname;

  return {
    isRootRegion,
    regionId,
    regionTitle,
    artifact,
    frontendUrl,
  };
}
