import { useCallback, useState } from 'react';
import { ConfigProvider, Select } from 'antd';
import delay from 'es-toolkit/compat/delay';

import filterAndSortBasedOnPosition from '@/util/filterAndSortBasedOnPosition';
import { scrollToNode } from '@/components/tree/elements/helpers';
import { classNames } from '@/util/utils';

import type { TTreeNode } from '@/components/tree/types';

interface Props {
  options: Array<{ value: string; label: string; data: TTreeNode }>;
  onSelect?: (region: TTreeNode) => void;
}

export default function TreeSearch({ options, onSelect }: Props) {
  const [searchValue, setSearchValue] = useState<string | undefined>(undefined);
  const handleSelect = useCallback(
    (value: string) => {
      const selectedOption = options.find((option) => option.value === value);
      if (selectedOption) {
        onSelect?.(selectedOption.data);
        delay(() => {
          scrollToNode(selectedOption.data);
          setSearchValue(undefined);
        }, 500);
      }
    },
    [options, onSelect]
  );

  return (
    <div className="w-full">
      <ConfigProvider
        theme={{
          hashed: false,
          token: {
            colorBgContainer: '#fff',
            colorBgElevated: '#fff',
            colorBorder: '#003a8c',
            colorPrimary: '#003a8c',
            colorText: '#003a8c',
            colorTextSecondary: 'white',
            colorTextTertiary: 'white',
            colorTextQuaternary: 'white',
            colorTextPlaceholder: '#003a8c',
            controlItemBgActive: '#0050B3',
            controlItemBgHover: '#f5f5f5',
          },
        }}
      >
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
          className={classNames(
            'rounded-full! outline-none',
            '[&:hover_.ant-select-selector]:border-white!',
            '[&.ant-select-focused_.ant-select-selector]:border-neutral-2!',
            '[&.ant-select-focused_.ant-select-selector]:shadow-none!',
            'has-[.ant-select-clear]:[&_.ant-select-arrow]:hidden!',
            '[&_.ant-select-clear]:bg-transparent!',
            '[&_.ant-select-selector]:rounded-full!',
            '[&_.ant-select-selector]:border-neutral-1!',
            '[&_.ant-select-selector]:shadow-lg!',
            '[&_.ant-select-selection-search-input]:text-sm!',
            '[&_.ant-select-selection-placeholder]:text-neutral-3'
          )}
        />
      </ConfigProvider>
    </div>
  );
}
