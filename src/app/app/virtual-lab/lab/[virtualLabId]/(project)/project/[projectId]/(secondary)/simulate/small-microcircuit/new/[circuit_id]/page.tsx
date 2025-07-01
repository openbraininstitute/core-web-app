'use client';

import { useParams } from 'next/navigation';
import Ajv, { AnySchema } from 'ajv';
import React, { Fragment, useMemo, useState } from 'react';
import { atom } from 'jotai';
import NextImage from 'next/image';
import { LoadingOutlined } from '@ant-design/icons';

import { JSONSchemaForm, ConfigValue } from './_components/components';
import { Params, JSONSchema, AtomsMap, TabType } from './types';
import { useObioneJsonSchema, useSchemaUtils } from './_components/hooks/schema';
import TabsSelector from './_components/tabs-selector';
import { useSectionRenderer } from './_components/section';
import { useConfigAtom } from './_components/hooks/config-atom';
import { CATEGORIES, isAtom, ORDERING } from './_components/utils';

import { assertErrorMessage, classNames } from '@/util/utils';
import { useAppNotification } from '@/components/notification';
import authFetch from '@/authFetch';
import { basePath } from '@/config';

import styles from './page.module.css';

export default function TinyCircuitSimulation() {
  const [tab, setTab] = useState<TabType>('configuration');
  const [configTab, setConfigTab] = useState<string>('info');
  const { circuit_id: circuitId, virtualLabId, projectId } = useParams<Params>();
  const [editing, setEditing] = useState(true);
  const [schema, setSchema] = useState<JSONSchema | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const notification = useAppNotification();
  const [campaignId, setCampaignId] = useState('');

  const selectedCatSchema = schema?.properties?.[configTab]?.additionalProperties?.anyOf?.find(
    (s) => s.properties?.type.const === selectedCategory
  );

  const { isRootCategory, resolveKey } = useSchemaUtils(schema, configTab);

  const validate = useMemo(() => {
    const ajv = new Ajv({ strictSchema: false, allErrors: true });
    if (!schema) return;
    return ajv.compile(schema as AnySchema);
  }, [schema]);

  const [atomsMap, setAtomsMap] = useState<AtomsMap>({});
  const config = useConfigAtom(schema, atomsMap);

  const errors = useMemo(() => {
    if (validate) validate(config);
    return validate?.errors;
  }, [validate, config]);

  useObioneJsonSchema(circuitId, notification, setSchema, setAtomsMap);
  const renderSection = useSectionRenderer(
    schema,
    atomsMap,
    setAtomsMap,
    configTab,
    setConfigTab,
    isRootCategory,
    resolveKey,
    config,
    campaignId,
    loading,
    errors,
    selectedItemIdx,
    setSelectedItemIdx,
    setEditing,
    setSelectedCategory
  );

  if (!schema) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingOutlined />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col space-y-5 bg-gray-100 px-10 pt-6">
      <TabsSelector tab={tab} setTab={setTab} disableSimulationTab={!campaignId || loading} />
      <div className="w-full border-t border-gray-200" />
      {tab === 'configuration' && (
        <div className={styles.threeColumns}>
          {/* "grid h-[calc(100%-100px)] grid-cols-[1fr_1fr_2fr] gap-5"> */}
          <div>
            <div className="flex flex-grow flex-col items-center gap-5 overflow-y-auto border-r border-gray-200 pr-5 pb-5">
              {CATEGORIES.map((c) => {
                return (
                  <Fragment key={c}>
                    <div className="self-start text-gray-500 uppercase">{c}</div>
                    {schema.properties &&
                      Object.entries(schema.properties)
                        .filter(([k]) => k !== 'type' && ORDERING[k]?.category === c)
                        .sort((a, b) => {
                          const order = (k: string) => ORDERING[k]?.order ?? 999;
                          return order(a[0]) - order(b[0]);
                        })
                        .map((entry) => {
                          return renderSection(entry);
                        })}
                  </Fragment>
                );
              })}
            </div>
            <button
              type="button"
              className={classNames(
                'flex min-h-[50px] w-[95%] items-center justify-center rounded-full text-lg drop-shadow',
                (errors && errors.length > 0) || loading
                  ? 'bg-gray-300 text-gray-500'
                  : 'bg-gradient-to-r from-[#003A8C] to-[#001026] text-white'
              )}
              onClick={async () => {
                if (loading) return;
                if (campaignId) {
                  setCampaignId('');
                  return;
                }

                setLoading(true);
                try {
                  const res = await authFetch(
                    `${process.env.NEXT_PUBLIC_OBI_ONE_URL}/generated/simulations-generate-grid-save`,
                    {
                      method: 'POST',
                      body: JSON.stringify(config),
                      headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'virtual-lab-id': virtualLabId,
                        'project-id': projectId,
                      },
                    }
                  );

                  if (res.status !== 200) {
                    const errorRes = await res.json();

                    const details =
                      res.status === 500 ? errorRes.detail : (errorRes?.details?.[0].msg ?? '');

                    notification.error({
                      message: 'An error ocurred generating the simulation campaign',
                      description: details,
                    });
                    return;
                  }

                  const returnedCampaignId = (await res.json()) as string;
                  if (returnedCampaignId === '') {
                    notification.error({
                      message: 'An error ocurred generating the simulation campaign',
                    });
                    return;
                  }

                  setCampaignId(returnedCampaignId);
                  setTab('simulations');
                } catch (e) {
                  notification.error({ message: assertErrorMessage(e) });
                  return;
                } finally {
                  setLoading(false);
                }
              }}
              disabled={!!(errors && errors.length > 0) || loading}
            >
              <div className="flex justify-between gap-5">
                {!campaignId ? 'Generate simulations' : 'New simulation campaign'}
                {loading && <LoadingOutlined />}
              </div>
            </button>
          </div>
          <div>
            {schema.properties &&
              schema.properties?.[configTab]?.additionalProperties?.anyOf &&
              !selectedCategory &&
              editing && (
                <div>
                  {schema.properties[configTab].additionalProperties.anyOf.map((o) => {
                    return (
                      <Fragment key={o.title}>
                        {/* eslint-disable-next-line */}
                        <div
                          className="min-h-[100px] w-full cursor-pointer rounded-xl border border-gray-200 p-5 hover:bg-white"
                          onClick={() => {
                            if (isRootCategory(configTab)) return;

                            setSelectedCategory(o.properties?.type.const ?? '');
                            const initial: Record<string, ConfigValue> = {};
                            if (o.properties)
                              Object.entries(o.properties).forEach(([subkey, subValue]) => {
                                if (subkey === 'type') initial[subkey] = subValue.const ?? null;
                                else initial[subkey] = subValue.default ?? null;
                              });
                            const itemIndexes = Object.keys(atomsMap[configTab]).map((subkey) =>
                              parseInt(subkey.split('_')[1], 10)
                            );
                            itemIndexes.sort((a, b) => a - b);
                            const itemIdx = (itemIndexes.at(-1) ?? -1) + 1;
                            setSelectedItemIdx(itemIdx);
                            setAtomsMap({
                              ...atomsMap,
                              [configTab]: {
                                ...atomsMap[configTab],
                                [resolveKey(configTab, itemIdx)]:
                                  atom<Record<string, ConfigValue>>(initial),
                              },
                            });
                          }}
                        >
                          <div className="text-primary-9 text-lg font-bold">{o.title}</div>
                          <div className="mt-3">{o.description}</div>
                        </div>
                      </Fragment>
                    );
                  })}
                </div>
              )}

            {schema.properties &&
              schema.properties?.[configTab] &&
              editing &&
              (isRootCategory(configTab) || selectedCatSchema) && (
                <JSONSchemaForm
                  disabled={!!campaignId || loading}
                  config={config}
                  circuitId={circuitId}
                  schema={
                    selectedCatSchema ??
                    schema.properties[configTab]?.additionalProperties ??
                    schema.properties[configTab]
                  }
                  stateAtom={
                    isAtom(atomsMap[configTab])
                      ? atomsMap[configTab]
                      : atomsMap[configTab][resolveKey(configTab, selectedItemIdx)]
                  }
                />
              )}
          </div>
          <div>
            <NextImage
              width={1000}
              height={1130}
              alt="Circuit"
              src={`${basePath}/images/circuit_test_image.png`}
              className="w-full rounded-xl border border-gray-200"
            />
          </div>
        </div>
      )}
    </div>
  );
}
