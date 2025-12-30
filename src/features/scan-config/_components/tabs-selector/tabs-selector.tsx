import React from 'react';

import { Tab } from '../components';
import { TabType } from '../../types';
import { classNames } from '@/util/utils';

interface TabsSelectorProps {
  className?: string;
  tab: TabType;
  setTab(tab: TabType): void;
  disableSimulationTab: boolean;
}

export default function TabsSelector({
  className,
  tab,
  setTab,
  disableSimulationTab,
}: TabsSelectorProps) {
  return (
    <div className={classNames(className, 'flex')}>
      <div className="inline-flex overflow-hidden rounded-full border border-gray-200">
        <Tab
          tab="configuration"
          rounded="rounded-l-full"
          selectedTab={tab}
          onClick={() => setTab('configuration')}
        >
          Configuration
        </Tab>
        <Tab
          tab="simulations"
          rounded="rounded-r-full"
          selectedTab={tab}
          onClick={() => setTab('simulations')}
          disabled={disableSimulationTab}
        >
          Simulations
        </Tab>
      </div>
    </div>
  );
}
