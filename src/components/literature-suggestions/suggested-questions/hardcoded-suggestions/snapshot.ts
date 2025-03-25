import React from 'react';
import { useAtomValue } from 'jotai';

import { selectedBrainRegionAtom } from '@/state/brain-regions';
import { useCurrentExplorerArtifactValue } from '@/state/explore-section/artifact';

interface Snapshot {
  region: string;
  artifact: string;
}

export function useSnapshot(): Snapshot {
  const [snapshot, setSnapshot] = React.useState<Snapshot>({
    region: 'whole mouse brain',
    artifact: 'Morphology',
  });
  const selectedBrainRegion = useAtomValue(selectedBrainRegionAtom);
  const artifact = useCurrentExplorerArtifactValue();
  React.useEffect(() => {
    setSnapshot({
      region: selectedBrainRegion?.title ?? 'whole mouse brain',
      artifact,
    });
  }, [selectedBrainRegion?.title, artifact]);
  return snapshot;
}
