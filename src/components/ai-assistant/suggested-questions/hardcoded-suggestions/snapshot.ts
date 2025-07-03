import React from 'react';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { useParams } from 'next/navigation';

import { useCurrentExplorerArtifactValue } from '@/state/explore-section/artifact';
import {
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  useBrainRegionHierarchy,
} from '@/features/brain-region-hierarchy/context';
import { resolveDataKey } from '@/utils/key-builder';

interface Snapshot {
  regionId: string;
  regionTitle: string;
  artifact: string;
}

export function useSnapshot(): Snapshot {
  const [snapshot, setSnapshot] = React.useState<Snapshot>({
    regionId: '',
    regionTitle: '',
    artifact: 'Morphology',
  });
  const params = useParams<{ projectId: string }>();
  const { projectId } = params;
  const dataKey = resolveDataKey({ projectId, section: 'build' });
  const { node: selectedBrainRegion } = useBrainRegionHierarchy({ dataKey });
  const result = useAtomValue(
    React.useMemo(() => unwrap(brainRegionBasicCellGroupsRegionsHierarchyAtom), [])
  );
  const regionId = selectedBrainRegion?.id ?? '';
  const node = (result?.options ?? []).find((o) => o.data.id === selectedBrainRegion?.id);
  const regionTitle = node?.label ?? '';
  const artifact = useCurrentExplorerArtifactValue();

  React.useEffect(() => {
    setSnapshot({ regionId, regionTitle, artifact });
  }, [regionId, regionTitle, artifact]);

  return snapshot;
}
