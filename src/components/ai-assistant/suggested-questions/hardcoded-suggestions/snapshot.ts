import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { useParams } from 'next/navigation';
import React from 'react';
import {
  BASIC_CELL_GROUPS_AND_REGIONS_BRAIN_REGION_ANNOTATION_VALUE,
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  useBrainRegionHierarchy,
} from '@/features/brain-region-hierarchy/context';

import { useCurrentExplorerArtifactValue } from '@/state/explore-section/artifact';
import { resolveDataKey } from '@/utils/key-builder';
import { useAiContext } from '../../hooks';

interface Snapshot {
  isRootRegion: boolean;
  regionId: string;
  regionTitle: string;
  artifact: string;
}

export function useSnapshot(): Snapshot {
  const [snapshot, setSnapshot] = React.useState<Snapshot>({
    isRootRegion: true,
    regionId: '',
    regionTitle: '',
    artifact: 'Morphology',
  });
  const params = useParams<{ projectId: string }>();
  const { projectId } = params;
  const { section } = useAiContext();
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

  React.useEffect(() => {
    setSnapshot({
      isRootRegion,
      regionId,
      regionTitle,
      artifact,
    });
  }, [isRootRegion, regionId, regionTitle, artifact]);

  return snapshot;
}
