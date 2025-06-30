/* eslint-disable no-param-reassign */
import React, { Fragment } from 'react';
import { atom } from 'jotai';
import {
  CheckCircleFilled,
  DeleteOutlined,
  PlusCircleOutlined,
  WarningFilled,
} from '@ant-design/icons';
import { ErrorObject } from 'ajv';

import { AtomsMap, JSONSchema } from '../types';
import { Chevron, Config, ConfigValue, Tab } from './components';
import { isAtom, isPlainObject } from './utils';

import { classNames } from '@/util/utils';

export function useSectionRenderer(
  schema: JSONSchema | null,
  atomsMap: AtomsMap,
  setAtomsMap: React.Dispatch<React.SetStateAction<AtomsMap>>,
  configTab: string,
  setConfigTab: (configTab: string) => void,
  isRootCategory: (key: string) => boolean | undefined,
  resolveKey: (tabKey: string, itemIdx: number | null) => string,
  config: Config,
  campaignId: string,
  loading: boolean,
  errors: ErrorObject<string, Record<string, any>, unknown>[] | null | undefined,
  selectedItemIdx: number | null,
  setSelectedItemIdx: (selectedItemIdx: number | null) => void,
  setEditing: React.Dispatch<React.SetStateAction<boolean>>,
  setSelectedCategory: React.Dispatch<React.SetStateAction<string>>
) {
  const [collapsedHeader, setCollapsedHeader] = React.useState(false);

  const renderSection = ([k, v]: [string, JSONSchema]) => {
    if (!schema || !schema?.properties) return;

    return (
      <Fragment key={k}>
        <Tab
          tab={k}
          selectedTab={configTab}
          onClick={() => {
            if (configTab === k && !isRootCategory(k)) {
              setEditing(false);
              setSelectedCategory('');
              setSelectedItemIdx(null);
              setCollapsedHeader(!collapsedHeader);
              return;
            }

            setCollapsedHeader(false);
            setConfigTab(k);
            setSelectedItemIdx(null);
            if (!v.additionalProperties) setEditing(true);
            else {
              setEditing(false);
            }
          }}
          extraClass="w-full flex justify-between h-[50px] min-h-[50px] items-center drop-shadow"
        >
          {schema.properties?.[k]?.title}
          <div className="flex gap-1">
            {errors?.find((error) => error.instancePath.startsWith('/' + k)) ? (
              <WarningFilled className="text-yellow-400" />
            ) : (
              <CheckCircleFilled className="text-green-600" />
            )}
            <Chevron rotate={v.additionalProperties ? 90 : 0} />
          </div>
        </Tab>
        {v.additionalProperties && configTab === k && config[k] && !collapsedHeader && (
          <>
            {Object.entries(config[k]).map(([subkey, subValue]) => {
              const idx = parseInt(subkey.split('_')[1], 10);

              const isSelected = configTab === k && idx === selectedItemIdx;

              return (
                <Fragment key={subkey}>
                  {/* eslint-disable-next-line */}
                  <div
                    className={classNames(
                      'text-primary-8 flex h-[50px] min-h-[50px] w-[90%] min-w-[150px] items-center justify-between rounded-full bg-gray-100 px-5 py-2 text-sm drop-shadow hover:bg-gradient-to-r hover:from-[#003A8C] hover:to-[#001026] hover:text-white',
                      isSelected ? 'bg-gradient-to-r from-[#003A8C] to-[#001026] text-white' : ''
                    )}
                    onClick={() => {
                      if (isPlainObject(subValue)) {
                        setSelectedCategory(typeof subValue.type === 'string' ? subValue.type : '');
                        setSelectedItemIdx(parseInt(subkey.split('_')[1], 10));
                      }
                      setEditing(true);
                    }}
                  >
                    {subkey}
                    <div className="flex gap-2">
                      {errors?.find((error) => error.instancePath.startsWith(`/${k}/${subkey}`)) ? (
                        <WarningFilled className="text-yellow-400" />
                      ) : (
                        <CheckCircleFilled className="text-green-600" />
                      )}

                      {!campaignId && !loading && (
                        <DeleteOutlined
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();

                            setSelectedCategory('');
                            setEditing(false);

                            const selectedTabAtoms = atomsMap[configTab];
                            if (!isAtom(selectedTabAtoms)) {
                              const refereeKey = resolveKey(configTab, idx);

                              delete selectedTabAtoms[refereeKey];

                              // Initialize case
                              const configInitialize = config.initialize;
                              if (
                                isPlainObject(configInitialize) &&
                                isPlainObject(configInitialize.node_set) &&
                                typeof configInitialize.node_set.block_name === 'string' &&
                                configInitialize.node_set.block_name === refereeKey
                              ) {
                                atomsMap.initialize = atom<Record<string, ConfigValue>>({
                                  ...configInitialize,
                                  node_set: null,
                                });
                              }

                              // Check all keys in the config
                              Object.entries(config)
                                .filter(([configK]) => configK !== 'initialize')
                                .forEach(([configK, configV]) => {
                                  if (typeof configV !== 'object') return;

                                  // Check all keys in a section (e.g stimuli, recordings)
                                  Object.entries(configV).forEach(([entryKey, entryV]) => {
                                    if (!isPlainObject(entryV)) return;

                                    // Check all values in a particular object (a single stimuli, a single timestamp, etc)
                                    Object.entries(entryV).forEach(([fieldK, field]) => {
                                      if (
                                        !isPlainObject(entryV) ||
                                        !isPlainObject(field) ||
                                        typeof field.block_name !== 'string' ||
                                        isAtom(atomsMap[configK]) || // skip top level atoms (e.g initialize)
                                        field.block_name !== refereeKey
                                      )
                                        return;

                                      // Deleting the reference to current object

                                      delete entryV[fieldK]; //eslint-disable-line

                                      // The atom that has a reference to current object
                                      atomsMap[configK][entryKey] =
                                        atom<Record<string, ConfigValue>>(entryV);
                                    });
                                  });
                                });

                              setAtomsMap({
                                ...atomsMap,
                                [configTab]: {
                                  ...selectedTabAtoms,
                                },
                              });
                            }

                            setSelectedItemIdx(null);
                          }}
                        />
                      )}
                    </div>
                  </div>
                </Fragment>
              );
            })}
            {/* Grey buttons with (+) icon. */}
            {!campaignId && !loading && (
              <button
                className="text-primary-8 flex h-[50px] min-h-[50px] w-[90%] min-w-[150px] items-center justify-between rounded-full bg-gray-100 px-5 py-2 text-sm drop-shadow"
                type="button"
                onClick={() => {
                  setEditing(true);
                  setSelectedCategory('');
                }}
              >
                Add {v.singular_name ?? v.title ?? 'item'}
                <PlusCircleOutlined />
              </button>
            )}
          </>
        )}
      </Fragment>
    );
  };

  return renderSection;
}
