import { BrainRegionDropdownWithFormItem } from '@/features/brain-region-dropdown/form-dropdown';
import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { AppUInterfaceSection, resolveDataKey } from '@/utils/key-builder';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

export function BrainRegionSelector() {
  const { projectId } = useWorkspace();

  const { node: defaultBrainRegion } = useBrainRegionHierarchy({
    dataKey: resolveDataKey({ section: AppUInterfaceSection.Data, projectId }),
  });

  return (
    <BrainRegionDropdownWithFormItem
      clsx={{ trigger: 'rounded-full w-full h-12', content: 'z-[99999]' }}
      showIcon={false}
      charsPerLine={200}
      defaultBrainRegion={defaultBrainRegion as IBrainRegionHierarchy}
    />
  );
}
