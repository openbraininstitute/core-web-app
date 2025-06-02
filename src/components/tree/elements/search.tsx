import { useCallback, useState } from 'react';
import { ConfigProvider, Select } from 'antd';
import delay from 'lodash/delay';

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
        }, 100);
      }
    },
    [options, onSelect, scrollToNode]
  );

  return (
    <div className="w-full">
      <ConfigProvider
        theme={{
          hashed: false,
          token: {
            colorBgContainer: '#003A8C',
            colorBgElevated: '#003A8C',
            colorBorder: '#003A8C',
            colorPrimary: 'white',
            colorText: 'white',
            colorTextSecondary: 'white',
            colorTextTertiary: 'white',
            colorTextQuaternary: 'white',
            colorTextPlaceholder: '#69C0FF',
            controlItemBgActive: '#0050B3',
            controlItemBgHover: '#096DD9',
          },
        }}
      >
        <Select
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
            'outline-none',
            '[&:hover_.ant-select-selector]:border-white!',
            '[&.ant-select-focused_.ant-select-selector]:border-white!',
            '[&.ant-select-focused_.ant-select-selector]:shadow-none!',
            'has-[.ant-select-clear]:[&_.ant-select-arrow]:hidden!',
            '[&_.ant-select-clear]:bg-transparent!'
          )}
        />
      </ConfigProvider>
    </div>
  );
}
