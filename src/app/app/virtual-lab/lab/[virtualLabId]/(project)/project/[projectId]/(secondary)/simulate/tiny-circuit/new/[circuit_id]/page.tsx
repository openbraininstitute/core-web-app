'use client';

import { useParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { assertErrorMessage, classNames, memoize } from '@/util/utils';

import { WorkspaceContext } from '@/types/common';
import memoizeOne from 'memoize-one';
import { atom, useAtom } from 'jotai';
import { Params, JSONSchema } from './types';
// import { InitializeForm } from './components';
import { getErrorsAtom } from './state';
import { Loading3QuartersOutlined, LoadingOutlined } from '@ant-design/icons';
import { notification } from 'antd/lib';
import $RefParser from '@apidevtools/json-schema-ref-parser';

import JSONSchemaForm from './components';
import { selectedTabFamily } from '@/components/VirtualLab/ScopeSelector/state';
import { set } from 'lodash';

type TabType = 'configuration' | 'simulations';

export type Object = null | boolean | number | string | Object[] | { [key: string]: Object };

export default function TinyCircuitSimulation() {
  const [tab, setTab] = useState<TabType>('configuration');
  const [configTab, setConfigTab] = useState<string>('');
  const configTabClass = 'h-[50px] w-[90%] text-left';
  const { projectId, circuit_id } = useParams<Params>();
  const [errors] = useAtom(getErrorsAtom(circuit_id));
  const [schema, setSchema] = useState<JSONSchema | null>(null);

  const atomsMap = useMemo(() => {
    const map: { [key: string]: ReturnType<typeof atom<{ [key: string]: Object | string }>> } = {};
    if (!schema?.properties) return map;
    Object.entries(schema.properties).forEach(([k, v]) => {
      if (v.type === 'string' && v.const) map[k] = atom(v.const);
      else {
        map[k] = atom({});
      }
    });

    return map;
  }, [schema]);

  const configAtom = useMemo(() => {
    return atom((get) => {
      const result: Record<string, object> = {};
      Object.keys(atomsMap).forEach((key) => {
        result[key] = get(atomsMap[key]);
      });
      return result;
    });
  }, [atomsMap]);

  const [config] = useAtom(configAtom);

  console.log(config);

  useEffect(() => {
    async function fetchSpec() {
      try {
        const res = await fetch('https://staging.openbraininstitute.org/api/obi-one/openapi.json');
        const json = await res.json();
        const dereferenced = await $RefParser.dereference(json);
        // @ts-ignore
        setSchema(dereferenced.components.schemas.SimulationsForm);
      } catch (e) {
        notification.error({ message: assertErrorMessage(e) });
      }
    }

    fetchSpec();
  }, []);

  if (!schema) {
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
          {schema.properties &&
            Object.keys(schema.properties)
              .filter((k) => k !== 'type')
              .map((k) => (
                <Tab
                  tab={k}
                  key={k}
                  selectedTab={configTab}
                  onClick={() => setConfigTab(k)}
                  extraClass="w-[90%] flex justify-between h-[50px] items-center"
                >
                  {schema.properties?.[k]?.title}
                  <Chevron />
                </Tab>
              ))}
        </div>
        <div>
          {schema.properties && schema.properties?.[configTab] && (
            <JSONSchemaForm schema={schema.properties[configTab]} stateAtom={atomsMap[configTab]} /> // Todo types
          )}
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
