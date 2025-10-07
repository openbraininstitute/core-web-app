'use client';

import { useAtomValue, atom, useAtom } from 'jotai';
import { unwrap } from 'jotai/utils';
import { useMemo } from 'react';
import find from 'es-toolkit/compat/find';

import MenuTabs from '@/components/MenuTabs';

import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import {
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  useBrainRegionHierarchy,
} from '@/features/brain-region-hierarchy/context';
import { classNames } from '@/util/utils';

enum DataTypeTabsEnum {
  'Experimental data' = 'experimental-data',
  'Model data' = 'model-data',
}

type DataTypeActiveTab = `${DataTypeTabsEnum}`;

export const dataTabAtom = atom<DataTypeActiveTab>('experimental-data');

const DATA_TYPE_TABS = Object.keys(DataTypeTabsEnum).map((key) => ({
  id: DataTypeTabsEnum[key as keyof typeof DataTypeTabsEnum],
  label: key,
}));

export default function EntityGroupTabs({ dataKey }: { dataKey: string }) {
  const [dataTypeActiveTab, setDataTypeTab] = useAtom(dataTabAtom);
  const { node } = useBrainRegionHierarchy({ dataKey });
  const result = useAtomValue(
    useMemo(() => unwrap(brainRegionBasicCellGroupsRegionsHierarchyAtom), [])
  );
  const brainRegion = find(result?.options, (o) => o.data.id === node.id);

  const onTabClick = async (activeKey: string) => {
    setDataTypeTab(activeKey as DataTypeActiveTab);
    const artifactName = DATA_TYPE_TABS.find((o) => o.id === activeKey)?.label;
    if (artifactName) userJourneyTracker.registerArtifactClick(artifactName);
  };

  return (
    <div className="z-10 flex max-h-[80px] w-full items-center justify-between px-4 pt-8">
      <h1
        className={classNames(
          'flex w-1/2 items-center justify-start self-start pl-4 text-[1.6rem] font-bold'
        )}
        style={{ color: `#${brainRegion?.data.color_hex_triplet}` }}
        title={brainRegion?.label}
      >
        <span
          className="mr-2 inline-block h-[10px] min-h-[10px] w-[10px] min-w-[10px] rounded-full leading-9"
          style={{ background: `#${brainRegion?.data.color_hex_triplet}` }}
        />
        <span className="line-clamp-2">{brainRegion?.label}</span>
      </h1>
      <div className="ml-auto flex w-fit flex-nowrap">
        <MenuTabs items={DATA_TYPE_TABS} onTabClick={onTabClick} activeKey={dataTypeActiveTab} />
      </div>
    </div>
  );
}
