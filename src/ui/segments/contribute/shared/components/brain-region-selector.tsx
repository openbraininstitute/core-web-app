import { BrainRegionDropdownWithFormItem } from '@/features/brain-region-dropdown/form-dropdown';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

interface IBrainRegionSelectorProps {
  defaultBrainRegion?: IBrainRegionHierarchy;
  value?: string;
  onChange?: (value: string) => void;
}

export function BrainRegionSelector({ defaultBrainRegion, value, onChange }: IBrainRegionSelectorProps) {
  return (
    <BrainRegionDropdownWithFormItem
      clsx={{ trigger: 'rounded-full w-full h-12', content: 'z-[99999]' }}
      showIcon={false}
      charsPerLine={200}
      defaultBrainRegion={defaultBrainRegion}
      value={value}
      onChange={onChange}
    />
  );
}
