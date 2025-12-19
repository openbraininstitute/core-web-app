import React from 'react';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { useParams, usePathname, useSearchParams } from 'next/navigation';

import { useAiContext } from '../hooks';

import { useCurrentExplorerArtifactValue } from '@/state/explore-section/artifact';
import {
  BASIC_CELL_GROUPS_AND_REGIONS_BRAIN_REGION_ANNOTATION_VALUE,
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  useBrainRegionHierarchy,
} from '@/features/brain-region-hierarchy/context';
import { resolveDataKey } from '@/utils/key-builder';

export interface Snapshot {
  isRootRegion: boolean;
  regionId: string;
  regionTitle: string;
  artifact: string;
  frontendUrl: string;
}

export function useSnapshot(): Snapshot {
  const params = useParams<{ projectId: string }>();
  const { projectId } = params;
  const { section } = useAiContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dataKey = resolveDataKey({ projectId, section });
  const { node: selectedBrainRegion } = useBrainRegionHierarchy({ dataKey });
  const isRootRegion =
    `${selectedBrainRegion.annotation_value}` ===
    BASIC_CELL_GROUPS_AND_REGIONS_BRAIN_REGION_ANNOTATION_VALUE;
  const result = useAtomValue(
    React.useMemo(() => unwrap(brainRegionBasicCellGroupsRegionsHierarchyAtom), [])
  );
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
