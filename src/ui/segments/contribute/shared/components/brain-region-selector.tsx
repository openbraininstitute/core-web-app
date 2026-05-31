import { BrainRegionDropdownWithFormItem } from '@/features/brain-region-dropdown/form-dropdown';

interface IBrainRegionSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
}

export function BrainRegionSelector({ value, onChange }: IBrainRegionSelectorProps) {
  return (
    <BrainRegionDropdownWithFormItem
      clsx={{ trigger: 'rounded-full w-full h-12', content: 'z-[99999]' }}
      showIcon={false}
      charsPerLine={200}
      value={value}
      onChange={onChange}
    />
  );
}
