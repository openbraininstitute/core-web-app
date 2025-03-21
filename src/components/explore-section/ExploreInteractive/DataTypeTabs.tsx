'use client';

import { useMemo } from 'react';
import { useAtomValue, atom, useAtom } from 'jotai';
import { unwrap } from 'jotai/utils';

import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { brainRegionsAtom, selectedBrainRegionAtom } from '@/state/brain-regions';
import MenuTabs from '@/components/MenuTabs';

enum DataTypeTabsEnum {
  'Experimental data' = 'experimental-data',
  'Model data' = 'model-data',
  /**
   * Daniela asked to remove it in this ticket:
   * https://github.com/openbraininstitute/prod-explore-functionality/issues/47#issuecomment-2729269604
   */
  // 'Literature' = 'literature',
}

type DataTypeActiveTab = `${DataTypeTabsEnum}`;

export const dataTabAtom = atom<DataTypeActiveTab>('experimental-data');

const DATA_TYPE_TABS = Object.keys(DataTypeTabsEnum).map((key) => ({
  id: DataTypeTabsEnum[key as keyof typeof DataTypeTabsEnum],
  label: key,
}));

export default function DataTypeTabs() {
  const [dataTypeActiveTab, setDataTypeTab] = useAtom(dataTabAtom);
  const selectedBrainRegion = useAtomValue(selectedBrainRegionAtom);
  const brainRegions = useAtomValue(useMemo(() => unwrap(brainRegionsAtom), []));
  const selected = brainRegions?.find((brainRegion) => brainRegion.id === selectedBrainRegion?.id);

  const onTabClick = async (activeKey: string) => {
    setDataTypeTab(activeKey as DataTypeActiveTab);
    if (!(await userJourneyTracker.getCurrentTuple())) {
      await userJourneyTracker.handleBrainRegionClick(selectedBrainRegion?.title!);
    }
    const artifact = DATA_TYPE_TABS.find((o) => o.id === activeKey)?.label;
    await userJourneyTracker.handleClick('data_type', artifact!);
  };

  return (
    selected && (
      <div className="z-10 flex max-h-[80px] w-full items-center justify-between px-4 pt-8">
        <h1
          className="flex w-1/2 items-center justify-start self-start  pl-4 text-[1.6rem] font-bold"
          style={{ color: selected?.colorCode }}
          title={selectedBrainRegion?.title}
        >
          <span
            className="mr-2 inline-block h-[10px] min-h-[10px] w-[10px] min-w-[10px] rounded-full leading-9"
            style={{ background: selected.colorCode }}
          />
          <span className="line-clamp-2">{selectedBrainRegion?.title}</span>
        </h1>
        <div className="flex w-fit flex-nowrap">
          <MenuTabs items={DATA_TYPE_TABS} onTabClick={onTabClick} activeKey={dataTypeActiveTab} />
        </div>
      </div>
    )
  );
}
