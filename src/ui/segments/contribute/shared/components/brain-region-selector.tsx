import { BrainRegionDropdownWithFormItem } from '@/features/brain-region-dropdown/form-dropdown';
import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks/use-workspace-hierarchy';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

export function BrainRegionSelector() {
  const { selectedBrainRegion } = useWorkspaceHierarchyRegistry();

  return (
    <BrainRegionDropdownWithFormItem
      clsx={{ trigger: 'rounded-full w-full h-12', content: 'z-[99999]' }}
      showIcon={false}
      charsPerLine={200}
      defaultBrainRegion={selectedBrainRegion as IBrainRegionHierarchy}
    />
  );
}
