import React from 'react';
import { useAtomValue } from 'jotai';

import { selectedBrainRegionAtom } from '@/state/brain-regions';
import { useCurrentExplorerArtifactValue } from '@/state/explore-section/artifact';

interface Snapshot {
  regionId: string;
  regionTitle: string;
  artifact: string;
}

export const ROOT_REGION_ID = 'http://api.brain-map.org/api/v2/data/Structure/8';

export function useSnapshot(): Snapshot {
  const [snapshot, setSnapshot] = React.useState<Snapshot>({
    regionId: '',
    regionTitle: '',
    artifact: 'Morphology',
  });
  const selectedBrainRegion = useAtomValue(selectedBrainRegionAtom);
  const artifact = useCurrentExplorerArtifactValue();
  React.useEffect(() => {
    setSnapshot({
      regionId: selectedBrainRegion?.id ?? '',
      regionTitle: selectedBrainRegion?.title ?? '',
      artifact,
    });
  }, [selectedBrainRegion, artifact]);
  return snapshot;
}
