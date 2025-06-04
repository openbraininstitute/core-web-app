'use client';

import { useParams } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { assertErrorMessage, classNames, memoize } from '@/util/utils';

import { WorkspaceContext } from '@/types/common';
import memoizeOne from 'memoize-one';
import { atom, useAtom } from 'jotai';
import { Params } from './types';
// import { InitializeForm } from './components';
import { getErrorsAtom } from './state';
import { Loading3QuartersOutlined, LoadingOutlined, WarningFilled } from '@ant-design/icons';
import { notification } from 'antd/lib';
import { JSONSchema } from './types';
import { Special_Elite } from 'next/font/google';

type TabType = 'configuration' | 'simulations';

export default function TinyCircuitSimulation() {
  const [tab, setTab] = useState<TabType>('configuration');
  const [configTab, setConfigTab] = useState<string>('');
  const configTabClass = 'h-[50px] w-[90%] text-left';
  const { projectId, circuit_id } = useParams<Params>();
  const [errors] = useAtom(getErrorsAtom(circuit_id));
  const [spec, setSpec] = useState<{ [key: string]: JSONSchema } | null>(null);

  useEffect(() => {
    async function fetchSpec() {
      try {
        const res = await fetch('https://staging.openbraininstitute.org/api/obi-one/openapi.json');
        const json = await res.json();
        setSpec(json.components.schemas);
      } catch (e) {
        notification.error({ message: assertErrorMessage(e) });
      }
    }

    fetchSpec();
  }, []);

  if (!spec || !spec.SimulationsForm) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingOutlined />
      </div>
    );
  }

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
            onClick={() => setTab('configuration')}
          >
            Configuration
          </Tab>
          <Tab
            tab="simulations"
            rounded="rounded-r-full"
            selectedTab={tab}
            onClick={() => setTab('simulations')}
          >
            Simulations
          </Tab>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-5 overflow-auto">
        <div className="flex flex-col items-center gap-5">
          {Object.keys(spec.SimulationsForm?.properties ?? {}).map((k) => (
            <Tab tab={k} key={k} selectedTab={configTab} onClick={() => setConfigTab(k)} extraClass=''>
              {snakeToTitleCase(k)}
            </Tab>
          ))}
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
  tab: string;
  selectedTab: string;
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

function snakeToTitleCase(snakeStr: string): string {
  return snakeStr
    .split('_') // split by underscore
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // capitalize first letter
    .join(' '); // join words with space
}
