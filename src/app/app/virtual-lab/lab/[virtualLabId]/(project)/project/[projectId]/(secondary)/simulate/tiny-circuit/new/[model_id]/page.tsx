'use client';

import React, { useCallback, useState } from 'react';
import { classNames } from '@/util/utils';
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { ChevronIcon } from '@/components/icons';

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
            <div className="flex items-center justify-between">
              Initialization
              <Chevron rotate={configTab === 'initialization' ? 180 : 0} />
            </div>
          </Tab>
          <Tab
            tab="timestamps"
            selectedTab={configTab}
            extraClass={configTabClass}
            onClick={() => setConfigTab('timestamps')}
          >
            <div className="flex items-center justify-between">
              Timestamps
              <Chevron rotate={90} />
            </div>
          </Tab>
          <Tab
            tab="stimuli"
            selectedTab={configTab}
            extraClass={configTabClass}
            onClick={() => setConfigTab('stimuli')}
          >
            <div className="flex items-center justify-between">
              Stimuli
              <Chevron rotate={90} />
            </div>
          </Tab>
          <Tab
            tab="recordings"
            selectedTab={configTab}
            extraClass={configTabClass}
            onClick={() => setConfigTab('recordings')}
          >
            <div className="flex items-center justify-between">
              Recordings
              <Chevron rotate={90} />
            </div>
          </Tab>
          <Tab
            tab="neuron-sets"
            selectedTab={configTab}
            extraClass={configTabClass}
            onClick={() => setConfigTab('neuron-sets')}
          >
            <div className="flex items-center justify-between">
              Neuron sets
              <Chevron rotate={90} />
            </div>
          </Tab>
          <Tab
            tab="synapse-sets"
            selectedTab={configTab}
            extraClass={configTabClass}
            onClick={() => setConfigTab('synapse-sets')}
          >
            <div className="flex items-center justify-between">
              Synapse sets
              <Chevron rotate={90} />
            </div>
          </Tab>
          <Tab
            tab="intercellular-location-sets"
            selectedTab={configTab}
            extraClass={configTabClass}
            onClick={() => setConfigTab('intercellular-location-sets')}
          >
            <div className="flex items-center justify-between">
              Inter cellular location sets
              <Chevron rotate={90} />
            </div>
          </Tab>
          <Tab
            tab="extracellular-location-sets"
            selectedTab={configTab}
            extraClass={configTabClass}
            onClick={() => setConfigTab('extracellular-location-sets')}
          >
            <div className="flex items-center justify-between">
              Extracellular location sets
              <Chevron rotate={90} />
            </div>
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
      style={
        tab === selectedTab
          ? { backgroundImage: 'linear-gradient(to right, #003A8C, #001026)' }
          : undefined
      }
      onClick={onClick}
      type="button"
      className={classNames(
        'min-w-[150px] px-5 py-2',
        extraClass,
        rounded,
        tab === selectedTab ? 'bg-primary-8 text-white' : 'text-primary-8 bg-white'
      )}
    >
      {children}
    </button>
  );
}

function Chevron({ rotate }: { rotate?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={rotate !== undefined ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      <path
        d="M6 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
