'use client';

import React, { useCallback, useState } from 'react';
import { classNames } from '@/util/utils';

type TabType = 'configuration' | 'simulations';
type ConfigTab =
  | 'initialization'
  | 'timestamps'
  | 'stimuli'
  | 'recordings'
  | 'neuron-sets'
  | 'synapse-sets'
  | 'intercellular-location-sets'
  | 'extracellular-location-sets';

export default function TinyCircuitSimulation() {
  const [tab, setTab] = useState<TabType>('configuration');
  const [configTab, setConfigTab] = useState<ConfigTab>('initialization');
  const configTabClass = 'h-[50px] w-[90%] text-left';

  return (
    <div className="flex h-screen flex-col space-y-5 bg-gray-100 p-5">
      <div className="flex">
        <div className="text-primary-8 flex h-[40px] min-w-[100px] items-center rounded-full bg-white pl-6 text-lg">
          name
        </div>
        <div className="ml-5 inline-flex overflow-hidden rounded-full border border-gray-300">
          <Tab
            tab="configuration"
            rounded="rounded-l-full"
            selectedTab={tab}
            onClick={useCallback(() => setTab('configuration'), [])}
          >
            Configuration
          </Tab>
          <Tab
            tab="simulations"
            rounded="rounded-r-full"
            selectedTab={tab}
            onClick={useCallback(() => setTab('simulations'), [])}
          >
            Simulations
          </Tab>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-5 overflow-auto">
        <div className="flex flex-col items-center gap-5">
          <Tab
            tab="initialization"
            selectedTab={configTab}
            extraClass={configTabClass}
            onClick={() => setConfigTab('initialization')}
          >
            Initialization
          </Tab>
          <Tab
            tab="timestamps"
            selectedTab={configTab}
            extraClass={configTabClass}
            onClick={() => setConfigTab('timestamps')}
          >
            Timestamps
          </Tab>
          <Tab
            tab="stimuli"
            selectedTab={configTab}
            extraClass={configTabClass}
            onClick={() => setConfigTab('stimuli')}
          >
            Stimuli
          </Tab>
          <Tab
            tab="recordings"
            selectedTab={configTab}
            extraClass={configTabClass}
            onClick={() => setConfigTab('recordings')}
          >
            Recordings
          </Tab>
          <Tab
            tab="neuron-sets"
            selectedTab={configTab}
            extraClass={configTabClass}
            onClick={() => setConfigTab('neuron-sets')}
          >
            Neuron sets
          </Tab>
          <Tab
            tab="synapse-sets"
            selectedTab={configTab}
            extraClass={configTabClass}
            onClick={() => setConfigTab('synapse-sets')}
          >
            Synapse sets
          </Tab>
          <Tab
            tab="intercellular-location-sets"
            selectedTab={configTab}
            extraClass={configTabClass}
            onClick={() => setConfigTab('intercellular-location-sets')}
          >
            Intracellular location sets
          </Tab>
          <Tab
            tab="extracellular-location-sets"
            selectedTab={configTab}
            extraClass={configTabClass}
            onClick={() => setConfigTab('extracellular-location-sets')}
          >
            Extracellular location sets
          </Tab>
        </div>
      </div>
    </div>
  );
}

function Tab({
  tab,
  selectedTab,
  children,
  onClick,
  rounded = 'rounded-full',
  extraClass,
}: {
  tab: TabType | ConfigTab;
  selectedTab: TabType | ConfigTab;
  onClick?: () => void;
  rounded?: 'rounded-l-full' | 'rounded-r-full' | 'rounded-full';
  children?: React.ReactNode;
  extraClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={classNames(
        'min-w-[150px] px-4 py-2',
        extraClass,
        rounded,
        tab === selectedTab ? 'bg-primary-8 text-white' : 'text-primary-8 bg-white'
      )}
    >
      {children}
    </button>
  );
}
