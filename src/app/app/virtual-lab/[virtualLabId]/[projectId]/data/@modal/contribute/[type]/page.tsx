'use client';

import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  CellMorphologyContribution,
  FixModalCloseBug,
} from '@/page-wrappers/contribute/cell-morphology';
import { resolveDataKey } from '@/utils/key-builder';

export default function ContributeCellMorphology() {
  const { projectId } = useWorkspace();
  const { node: defaultBrainRegion } = useBrainRegionHierarchy({
    dataKey: resolveDataKey({ section: 'explore', projectId }),
  });
  return (
    <FixModalCloseBug expectedPath="/contribute/cell-morphology">
      <CellMorphologyContribution
        isModal
        brainRegionId={defaultBrainRegion.id}
        key={defaultBrainRegion.id}
      />
    </FixModalCloseBug>
  );
}
