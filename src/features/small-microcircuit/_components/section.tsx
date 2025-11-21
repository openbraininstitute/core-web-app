/* eslint-disable no-param-reassign */
import React from 'react';
import { Input } from 'antd';
import { atom } from 'jotai';
import {
  CheckCircleFilled,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusCircleOutlined,
  WarningFilled,
} from '@ant-design/icons';
import { ErrorObject } from 'ajv';

import { AtomsMap, JSONSchema } from '../types';
import { Chevron, Config, ConfigValue, Tab } from './components';
import { isAtom, isPlainObject } from './utils';
import { isRootCategory } from './hooks/schema';

import { classNames } from '@/util/utils';

export function Section({
  schema,
  k,
  sectionSchema,
  atomsMap,
  setAtomsMap,
  configTab,
  setConfigTab,
  config,
  campaignId,
  loading,
  errors,
  selectedEntry,
  setSelectedEntry,
  setEditing,
  setSelectedCategory,
  readOnly,
  allEntries,
  newKey,
  setNewKey,
  editingKey,
  setEditingKey,
}: {
  schema: JSONSchema | null; // The global schema
  k: string; // secition key
  sectionSchema: JSONSchema; // The schema for this section
  atomsMap: AtomsMap;
  setAtomsMap: React.Dispatch<React.SetStateAction<AtomsMap>>;
  configTab: string; // Key for selected section
  setConfigTab: (configTab: string) => void;
  config: Config;
  campaignId: string;
  loading: boolean;
  errors: ErrorObject<string, Record<string, any>, unknown>[] | null | undefined;
  selectedEntry: string;
  setSelectedEntry: (selectedEntry: string) => void;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
  readOnly?: boolean;
  allEntries: Set<string>;
  newKey: string;
  setNewKey: (k: string) => void;
  editingKey: string;
  setEditingKey: (k: string) => void;
}) {
  if (!schema || !schema?.properties) return;

  const handleHeaderClick = (subkey: string, subValue: unknown) => {
    if (isPlainObject(subValue)) {
      setSelectedCategory(typeof subValue.type === 'string' ? subValue.type : '');
      setSelectedEntry(subkey);
    }
    setEditing(true);
    setEditingKey('');
    setNewKey('');
  };

  return (
    <>
      <Tab
        tab={k}
        selectedTab={configTab}
        onClick={() => {
          if (configTab === k && !isRootCategory(schema, k)) {
            setEditing(false);
            setSelectedCategory('');
            setSelectedEntry('');
            setConfigTab('');
            return;
          }

          setConfigTab(k);
          setSelectedEntry('');
          setSelectedCategory('');
          if (!sectionSchema.additionalProperties) setEditing(true);
          else setEditing(false);
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
          <Chevron rotate={sectionSchema.additionalProperties ? 90 : 0} />
        </div>
      </Tab>
      {sectionSchema.additionalProperties && configTab === k && config[k] && (
        <>
          {Object.entries(config[k]).map(([subkey, subValue]) => {
            const isSelected = configTab === k && subkey === selectedEntry;

            return (
              <div
                key={subkey}
                className={classNames(
                  'text-primary-8 flex h-[50px] min-h-[50px] w-[90%] min-w-[150px] items-center justify-between rounded-full bg-gray-100 px-5 py-2 text-sm drop-shadow hover:bg-gradient-to-r hover:from-[#003A8C] hover:to-[#001026] hover:text-white',
                  isSelected ? 'bg-gradient-to-r from-[#003A8C] to-[#001026] text-white' : ''
                )}
                tabIndex={0}
                role="button"
                onClick={() => handleHeaderClick(subkey, subValue)}
                onKeyDown={(evt) => {
                  if (evt.key === ' ' || evt.key === 'Enter') {
                    handleHeaderClick(subkey, subValue);
                  }
                }}
              >
                <div className="w-full">
                  {subkey === editingKey && (
                    <>
                      <Input
                        value={newKey}
                        className="inline-block h-[20px] w-[70%] text-sm outline-none"
                        classNames={{
                          input: 'border-none !bg-transparent text-white',
                        }}
                        ref={(element) => element?.focus()}
                        onChange={(v) => setNewKey(v.currentTarget.value)}
                        status={newKey === '' ? 'error' : undefined}
                        size="small"
                      />
                      <div className="ml-3 inline-block">
                        <CheckOutlined className="mr-2" />
                        <CloseOutlined
                          onClick={() => {
                            setEditingKey('');
                            setNewKey('');
                          }}
                        />
                      </div>
                    </>
                  )}

                  {subkey !== editingKey && (
                    <>
                      {subkey}
                      <EditOutlined
                        className="ml-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEntry(subkey);
                          setEditingKey(subkey);
                          setNewKey(subkey);
                        }}
                      />
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  {errors?.find((error) => error.instancePath.startsWith(`/${k}/${subkey}`)) ? (
                    <WarningFilled className="text-yellow-400" />
                  ) : (
                    <CheckCircleFilled className="text-green-600" />
                  )}

                  {!campaignId && !loading && !readOnly && (
                    <DeleteOutlined
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();

                        setSelectedCategory('');
                        setEditing(false);

                        const selectedTabAtoms = atomsMap[configTab];
                        if (!isAtom(selectedTabAtoms)) {
                          delete selectedTabAtoms[subkey];

                          // Initialize case
                          const configInitialize = config.initialize;
                          if (
                            isPlainObject(configInitialize) &&
                            isPlainObject(configInitialize.node_set) &&
                            typeof configInitialize.node_set.block_name === 'string' &&
                            configInitialize.node_set.block_name === subkey
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
                                    field.block_name !== subkey
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

                        setSelectedEntry('');
                        allEntries.delete(subkey);
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
          {!campaignId && !loading && !readOnly && (
            <button
              className="text-primary-8 flex h-[50px] min-h-[50px] w-[90%] min-w-[150px] items-center justify-between rounded-full bg-gray-100 px-5 py-2 text-sm drop-shadow"
              type="button"
              onClick={() => {
                setEditing(true);
                setSelectedCategory('');
              }}
            >
              Add {sectionSchema.singular_name ?? sectionSchema.title ?? 'element'}
              <PlusCircleOutlined />
            </button>
          )}
        </>
      )}
    </>
  );
}
