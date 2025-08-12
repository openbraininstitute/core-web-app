import { useCallback, useState } from 'react';
import { ConfigProvider, Select } from 'antd';

import filterAndSortBasedOnPosition from '@/util/filterAndSortBasedOnPosition';
import { cn } from '@/utils/css-class';

import type { ISpecies } from '@/api/entitycore/types/shared/global';

interface Props {
  options: Array<{ value: string; label: string; data: ISpecies | null }>;
  onSelect?: (species: ISpecies | null) => void;
}

export function SpeciesSwitcher({ options, onSelect }: Props) {
  const [searchValue, setSearchValue] = useState<string | undefined>(undefined);
  const handleSelect = useCallback(
    (value: string) => {
      const selectedOption = options.find((option) => option.value === value);
      if (selectedOption) {
        onSelect?.(selectedOption.data);
      }
    },
    [options, onSelect]
  );

  return (
    <div className="w-full">
      <ConfigProvider theme={{ hashed: false }}>
        <Select
          id="region-search"
          showSearch
          allowClear
          size="large"
          autoClearSearchValue
          placeholder="Search region..."
          optionFilterProp="label"
          value={searchValue}
          onChange={(value) => {
            setSearchValue(value);
            handleSelect(value);
          }}
          style={{ width: '100%' }}
          options={options}
          onSearch={(value) => {
            return filterAndSortBasedOnPosition(value, options);
          }}
          className={cn(
            'rounded-full! outline-none',
            '[&:hover_.ant-select-selector]:border-white!',
            '[&.ant-select-focused_.ant-select-selector]:border-neutral-3!',
            '[&.ant-select-focused_.ant-select-selector]:shadow-none!',
            'has-[.ant-select-clear]:[&_.ant-select-arrow]:hidden!',
            '[&_.ant-select-clear]:bg-transparent!',
            '[&_.ant-select-selector]:rounded-full!',
            '[&_.ant-select-selector]:border-neutral-1!',
            '[&_.ant-select-selection-search-input]:text-sm!',
            '[&_.ant-select-outlined:not(.ant-select-customize-input)_.ant-select-selector]:border-neutral-1!'
          )}
        />
      </ConfigProvider>
    </div>
  );
}
