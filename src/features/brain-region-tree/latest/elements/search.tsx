import { useCallback, useEffect, useMemo, useState } from 'react';
import { atom, useAtom, useSetAtom } from 'jotai';
import { ConfigProvider, Select } from 'antd';

import { findNodeByKey } from '@/features/brain-region-tree/latest/elements/helpers';
import { getBrainRegionHierarchy } from '@/api/entitycore/queries/general/brain-region';
import filterAndSortBasedOnPosition from '@/util/filterAndSortBasedOnPosition';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import { useBrainRegionHierarchy } from './context';
import { selectedBrainRegionAtom } from '../com';

const brainRegionsBaseAtom = atom<IBrainRegionHierarchy | null | undefined>(null);

export const brainRegionsAtom = atom(
  (get) => get(brainRegionsBaseAtom),
  async (get, set) => {
    try {
      const brainRegionsData = await getBrainRegionHierarchy({});
      const brainRegions = findNodeByKey<IBrainRegionHierarchy>('annotation_value', '8', brainRegionsData)

      console.log("ᦨ #  search.tsx:22 #  brainRegions:", brainRegions);

      set(brainRegionsBaseAtom, findNodeByKey<IBrainRegionHierarchy>('annotation_value', '8', brainRegionsData));

      console.log("ᦨ #  search.tsx:22 #  brainRegionsData:", brainRegionsData);

      return brainRegionsData;
    } catch (error) {
      console.error('Failed to fetch brain regions:', error);
      throw error;
    }
  }
);

const flattenBrainRegions = (
  node: IBrainRegionHierarchy,
  result: IBrainRegionHierarchy[] = []
): IBrainRegionHierarchy[] => {
  result.push(node);

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      flattenBrainRegions(child, result);
    }
  }

  return result;
};

interface BrainRegionSearchProps {
  dataKey: string;
}

export default function BrainRegionSearch({ dataKey }: BrainRegionSearchProps) {
  const [searchValue, setSearchValue] = useState<string | undefined>(undefined);
  const [brainRegionsData, fetchBrainRegions] = useAtom(brainRegionsAtom);
  const setSelectedBrainRegion = useSetAtom(selectedBrainRegionAtom(dataKey));


  useEffect(() => {
    fetchBrainRegions();
  }, [fetchBrainRegions]);

  const options = useMemo(() => {
    if (!brainRegionsData) return [];

    return flattenBrainRegions(brainRegionsData).map((region) => ({
      value: region.id,
      label: `${region.name}`,
      data: region,
    }));
  }, [brainRegionsData]);

  const handleSelect = useCallback(
    (value: string) => {
      const selectedOption = options.find((option) => option.value === value);
      if (selectedOption) {
        setSelectedBrainRegion(selectedOption.data);
        setTimeout(() => {
          const nodeElement = document.getElementById(
            selectedOption.data.annotation_value.toString()
          );
          if (nodeElement) {
            nodeElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }
        }, 100);
      }
    },
    [options, setSelectedBrainRegion]
  );

  return (
    <div className="w-full">
      <ConfigProvider
        theme={{
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
        />
      </ConfigProvider>
    </div>
  );
}
