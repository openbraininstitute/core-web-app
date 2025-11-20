'use client';

import { LoadingOutlined, UpOutlined } from '@ant-design/icons';
import Ajv, { AnySchema } from 'ajv';
import { atom } from 'jotai';
import { Fragment, Suspense, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SimulationsTab from './_components/simulations';
import { useApiUrl, useModel } from './_components/hooks';

import authFetch from '@/authFetch';
import { useAppNotification } from '@/components/notification';
import {
  Config,
  ConfigValue,
  JSONSchemaForm,
} from '@/features/small-microcircuit/_components/components';
import { useConfigAtom } from '@/features/small-microcircuit/_components/hooks/config-atom';
import {
  isNonEmptyCategory,
  isRootCategory,
  resolveKey,
  useObioneJsonSchema,
} from '@/features/small-microcircuit/_components/hooks/schema';
import ModelPreview from '@/features/small-microcircuit/_components/model-preview';
import { Section } from '@/features/small-microcircuit/_components/section';
import TabsSelector from '@/features/small-microcircuit/_components/tabs-selector';
import { CATEGORIES, isAtom, ORDERING } from '@/features/small-microcircuit/_components/utils';

import { AtomsMap, TabType } from '@/features/small-microcircuit/types';
import { ButtonCopyId } from '@/ui/molecules/button-copy-id';
import { assertErrorMessage, classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import styles from '@/features/small-microcircuit/small-microcircuit.module.css';

export default function SimulationCampaignConfiguration({
  modelId,
  virtualLabId,
  projectId,
  initialCampaignId,
  initialConfig,
  readOnly,
  className,
}: {
  modelId: string;
  virtualLabId: string;
  projectId: string;
  initialCampaignId?: string;
  initialConfig?: Config;
  readOnly?: boolean;
  className?: string;
}) {
  const router = useRouter();

  const [tab, setTab] = useState<TabType>('configuration');
  const [configTab, setConfigTab] = useState<string>('info');
  const [editing, setEditing] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const notification = useAppNotification();
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? '');
  const initialConfigValidated = useRef(false);
  const [atomsMap, setAtomsMap] = useState<AtomsMap>({});

  const { model } = useModel({ id: modelId, context: { virtualLabId, projectId } });

  const { schema, refLabels, referenceTypesToConfigKeys, referenceTypesToTitles } =
    useObioneJsonSchema(model, notification, setAtomsMap, initialConfig);

  const selectedCatSchema = schema?.properties?.[configTab]?.additionalProperties?.oneOf?.find(
    (s) => s.properties?.type.const === selectedCategory
  );

  const handleAddReferenceClick = (referenceTab: string) => {
    setConfigTab(referenceTab);
    setEditing(true);
    setSelectedCategory('');
  };

  const validate = useMemo(() => {
    const ajv = new Ajv({ strictSchema: false, allErrors: true });
    if (!schema) return;
    return ajv.compile(schema as AnySchema);
  }, [schema]);

  const config = useConfigAtom(schema, atomsMap);

  // Validate initial config
  if (validate && initialConfig && !initialConfigValidated.current) {
    initialConfigValidated.current = true;
    validate(initialConfig);
    if (validate.errors) throw new Error('Invalid Simulation Campaign Configuration');
  }

  const errors = useMemo(() => {
    if (validate) validate(config);
    return validate?.errors;
  }, [validate, config]);

  const apiUrl = useApiUrl({ model });

  if (!schema || !refLabels || !referenceTypesToConfigKeys || !referenceTypesToTitles) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingOutlined />
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col space-y-5', className)}>
      <header className={styles.header}>
        <TabsSelector tab={tab} setTab={setTab} disableSimulationTab={!campaignId || loading} />
        <div className="flex items-center justify-center gap-8">
          {!!campaignId && <ButtonCopyId label="Copy simulation campaign ID" value={campaignId} />}
        </div>
      </header>
      <div className="relative mb-10">
        <div className="w-full border-t border-gray-200" />
        <div className="text-primary-8 absolute -top-5 left-1/2 rounded-full bg-gray-50 p-2 px-3 shadow-sm">
          <UpOutlined onClick={() => router.back()} />
        </div>
      </div>

      {tab === 'configuration' && (
        <div className={styles.threeColumns}>
          <div className={styles.scrollable}>
            <div className="flex flex-grow flex-col items-center gap-5 overflow-y-auto pr-5 pb-5">
              {CATEGORIES.map((c) => {
                return (
                  isNonEmptyCategory(c, schema) && (
                    <Fragment key={c}>
                      <div className="self-start text-gray-500 uppercase">{c}</div>
                      {schema.properties &&
                        Object.entries(schema.properties)
                          .filter(([k]) => k !== 'type' && ORDERING[k]?.category === c)
                          .sort((a, b) => {
                            const order = (k: string) => ORDERING[k]?.order ?? 999;
                            return order(a[0]) - order(b[0]);
                          })
                          .map(([k, v]) => {
                            return (
                              <Section
                                key={k}
                                k={k}
                                schema={schema}
                                sectionSchema={v}
                                atomsMap={atomsMap}
                                setAtomsMap={setAtomsMap}
                                configTab={configTab}
                                setConfigTab={setConfigTab}
                                config={config}
                                campaignId={campaignId}
                                loading={loading}
                                errors={errors}
                                selectedItemIdx={selectedItemIdx}
                                setSelectedItemIdx={setSelectedItemIdx}
                                setEditing={setEditing}
                                setSelectedCategory={setSelectedCategory}
                                readOnly={readOnly}
                              />
                            );
                          })}
                    </Fragment>
                  )
                );
              })}
            </div>

            {!readOnly && (
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
                    const configCopy = { ...config };
                    configCopy.type = 'CircuitSimulationScanConfig';

                    const coordinateCountRes = await authFetch(
                      `${process.env.NEXT_PUBLIC_OBI_ONE_URL}/declared/scan_config/grid-scan-coordinate-count`,
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

                    if (coordinateCountRes.status !== 200) {
                      const message = await coordinateCountRes.json();
                      notification.error({
                        message: 'An error ocurred generating the simulation campaign',
                        description: message.detail,
                      });
                      return;
                    }

                    const res = await authFetch(apiUrl, {
                      method: 'POST',
                      body: JSON.stringify(config),
                      headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'virtual-lab-id': virtualLabId,
                        'project-id': projectId,
                      },
                    });

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
                disabled={!!(errors && errors.length > 0) || loading || readOnly}
              >
                <div className="flex justify-between gap-5">
                  {!campaignId ? 'Generate simulations' : 'New simulation campaign'}
                  {loading && <LoadingOutlined />}
                </div>
              </button>
            )}
          </div>
          <div
            className={classNames(
              styles.scrollable,
              'h-full overflow-y-auto border-r border-l border-gray-200 px-5'
            )}
          >
            {schema.properties &&
              schema.properties?.[configTab]?.additionalProperties?.oneOf &&
              !selectedCategory &&
              editing && (
                <div className="flex flex-col items-center gap-5">
                  {schema.properties[configTab].additionalProperties.oneOf.map((o) => {
                    return (
                      <Fragment key={o.title}>
                        {/* eslint-disable-next-line */}
                        <div
                          className="min-h-[100px] w-full cursor-pointer rounded-xl border border-gray-200 p-5 hover:bg-white"
                          onClick={() => {
                            if (isRootCategory(schema, configTab)) return;

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
                                [resolveKey(schema, configTab, itemIdx)]:
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
              (isRootCategory(schema, configTab) || selectedCatSchema) && (
                <JSONSchemaForm
                  referenceTypesToConfigKeys={referenceTypesToConfigKeys}
                  referenceTypesToTitles={referenceTypesToTitles}
                  refLabels={refLabels}
                  key={
                    isRootCategory(schema, configTab)
                      ? configTab
                      : resolveKey(schema, configTab, selectedItemIdx)
                  }
                  selectedCategory={selectedCategory}
                  onAddReferenceClick={handleAddReferenceClick}
                  disabled={!!campaignId || loading}
                  config={config}
                  schema={selectedCatSchema ?? schema.properties[configTab]}
                  stateAtom={
                    isAtom(atomsMap[configTab])
                      ? atomsMap[configTab]
                      : atomsMap[configTab][resolveKey(schema, configTab, selectedItemIdx)]
                  }
                  model={model}
                  virtualLabId={virtualLabId}
                  projectId={projectId}
                />
              )}
          </div>
          <div className="overflow-hidden rounded-lg">
            <ModelPreview model={model} />
          </div>
        </div>
      )}

      {tab === 'simulations' && (
        <Suspense>
          <SimulationsTab
            campaignId={campaignId}
            virtualLabId={virtualLabId}
            projectId={projectId}
          />
        </Suspense>
      )}
    </div>
  );
}
