/* eslint-disable no-param-reassign */

import {
  CheckCircleFilled,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusCircleOutlined,
  WarningFilled,
} from '@ant-design/icons';
import type { ErrorObject } from 'ajv';
import { Input } from 'antd';
import { atom } from 'jotai';
import type React from 'react';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';
import {
  type AtomsMap,
  type BlockDictionary,
  type ConfigSchema,
  type DiscriminatedUnion,
  type RootBlock,
  ScanConfigUIElementDict,
} from '../types';
import { Chevron, type Config, type ConfigValue, Tab } from './components';
import { isRootBlock } from './hooks/schema';
import { isAtom, isPlainObject } from './utils';

export function RootElement({
  schema,
  rootElement,
  rootElementSchema,
  atomsMap,
  setAtomsMap,
  selectedRootElement,
  setSelectedRootElement,
  config,
  campaignId,
  loading,
  errors,
  selectedEntry,
  setSelectedEntry,
  setEditing,
  readOnly,
  allEntries,
  newKey,
  setNewKey,
  isEditingKey,
  setIsEditingKey,
}: {
  schema: ConfigSchema | null; // The global schema
  rootElement: string;
  rootElementSchema: RootBlock | BlockDictionary | DiscriminatedUnion;
  atomsMap: AtomsMap;
  setAtomsMap: React.Dispatch<React.SetStateAction<AtomsMap>>;
  selectedRootElement: string;
  setSelectedRootElement: (configTab: string) => void;
  config: Config;
  campaignId: string;
  loading: boolean;
  errors: ErrorObject<string, Record<string, any>, unknown>[] | null | undefined;
  selectedEntry: string;
  setSelectedEntry: (selectedEntry: string) => void;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  readOnly?: boolean;
  allEntries: Set<string>;
  newKey: string;
  setNewKey: (k: string) => void;
  isEditingKey: boolean;
  setIsEditingKey: (k: boolean) => void;
}) {
  if (!schema || !schema?.properties) return;

  const handleHeaderClick = (subkey: string, subValue: unknown) => {
    if (isPlainObject(subValue)) {
      setSelectedEntry(subkey);
    }
    setEditing(true);
    setIsEditingKey(false);
    setNewKey('');
  };

  const newKeyError = allEntries.has(newKey) || !newKey || newKey === selectedEntry;

  const onNameChangeConfirm = (
    e: React.MouseEvent<HTMLSpanElement, MouseEvent> | React.KeyboardEvent<HTMLInputElement>
  ) => {
    e.stopPropagation();
    if (newKeyError) return;
    const selectedTabAtoms = atomsMap[selectedRootElement];
    if (newKey === selectedEntry) return;
    if (isAtom(selectedTabAtoms)) return;
    if (!isPlainObject(config[selectedRootElement])) return;

    allEntries.delete(selectedEntry);
    allEntries.add(newKey);

    selectedTabAtoms[newKey] = selectedTabAtoms[selectedEntry];
    delete selectedTabAtoms[selectedEntry];

    // Rename references

    // Initialize case
    const configInitialize = config.initialize;
    if (
      isPlainObject(configInitialize) &&
      isPlainObject(configInitialize.node_set) &&
      typeof configInitialize.node_set.block_name === 'string' &&
      configInitialize.node_set.block_name === selectedEntry
    ) {
      atomsMap.initialize = atom<Record<string, ConfigValue>>({
        ...configInitialize,
        node_set: { ...configInitialize.node_set, block_name: newKey },
      });
    }

    // Check all keys in the config
    Object.entries(config)
      .filter(([configK]) => configK !== 'initialize')
      .forEach(([configK, configV]) => {
        if (typeof configV !== 'object') return;

        // Check all keys in a section (e.g stimuli, recordings)
        Object.entries(configV).forEach(([_, entryV]) => {
          if (!isPlainObject(entryV)) return;

          // Check all values in a particular object (a single stimuli, a single timestamp, etc)
          Object.entries(entryV).forEach(([fieldK, field]) => {
            if (
              !isPlainObject(entryV) ||
              !isPlainObject(field) ||
              typeof field.block_name !== 'string' ||
              isAtom(atomsMap[configK]) || // skip top level atoms (e.g initialize)
              field.block_name !== selectedEntry
            )
              return;

            // Renaming the reference to current object
            entryV[fieldK].block_name = newKey;
          });
        });
      });

    setAtomsMap({ ...atomsMap });

    setIsEditingKey(false);
    setSelectedEntry(newKey);
    setNewKey('');
  };

  return (
    <>
      <Tab
        tab={rootElement}
        selectedTab={selectedRootElement}
        onClick={() => {
          // For block_dictionary, clicking again collapses it
          // For root_block and discriminated_union, they stay open
          if (
            selectedRootElement === rootElement &&
            !isRootBlock(schema, rootElement) &&
            rootElementSchema.ui_element !== ScanConfigUIElementDict.DiscriminatedUnion
          ) {
            setEditing(false);
            setSelectedEntry('');
            setSelectedRootElement('');
            return;
          }

          setSelectedRootElement(rootElement);
          setSelectedEntry('');

          if (
            rootElementSchema.ui_element === ScanConfigUIElementDict.RootBlock ||
            rootElementSchema.ui_element === ScanConfigUIElementDict.DiscriminatedUnion
          )
            setEditing(true);
          else setEditing(false);
        }}
        extraClass="w-full flex justify-between h-[50px] min-h-[50px] items-center drop-shadow"
      >
        {schema.properties?.[rootElement]?.title}
        <div className="flex gap-1">
          {errors?.find((error) => error.instancePath.startsWith('/' + rootElement)) ? (
            <WarningFilled className="text-yellow-400" />
          ) : (
            <CheckCircleFilled className="text-green-600" />
          )}
          <Chevron rotate={rootElementSchema.ui_element === 'block_dictionary' ? 90 : 0} />
        </div>
      </Tab>
      {rootElementSchema.ui_element === 'block_dictionary' &&
        selectedRootElement === rootElement &&
        config[rootElement] && (
          <>
            {Object.entries(config[rootElement]).map(([subkey, subValue]) => {
              const isSelected = selectedRootElement === rootElement && subkey === selectedEntry;

              return (
                <button
                  type="button"
                  key={subkey}
                  className={classNames(
                    'text-primary-8 flex h-[50px] min-h-[50px] w-90percent min-w-[150px] items-center justify-between rounded-full bg-gray-100 px-5 py-2 text-sm drop-shadow hover:bg-gradient-to-r hover:from-[#003A8C] hover:to-[#001026] hover:text-white',
                    isSelected ? 'bg-linear-to-r from-[#003A8C] to-[#001026] text-white' : ''
                  )}
                  tabIndex={0}
                  onClick={() => handleHeaderClick(subkey, subValue)}
                  onKeyDown={(evt) => {
                    if (evt.key === ' ' || evt.key === 'Enter') {
                      handleHeaderClick(subkey, subValue);
                    }
                  }}
                >
                  <div className="w-full text-left">
                    {isSelected && isEditingKey && !readOnly && (
                      <>
                        <Input
                          value={newKey}
                          className="inline-block h-[20px] w-[70%] text-sm outline-none"
                          classNames={{
                            input: 'border-none !bg-transparent text-white',
                          }}
                          ref={(element) => element?.focus()}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                              onNameChangeConfirm(e);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(v) => {
                            v.stopPropagation();
                            setNewKey(v.currentTarget.value);
                          }}
                          status={newKeyError ? 'error' : undefined}
                          size="small"
                        />
                        <div className="ml-3 inline-block">
                          <CheckOutlined
                            className={cn('mr-2', newKeyError && 'opacity-30')}
                            disabled={newKeyError}
                            onClick={onNameChangeConfirm}
                          />

                          <CloseOutlined
                            onClick={() => {
                              setIsEditingKey(false);
                              setNewKey('');
                            }}
                          />
                        </div>
                      </>
                    )}

                    {(!isSelected || (isSelected && !isEditingKey)) && (
                      <>
                        {subkey}
                        {!readOnly && !campaignId && (
                          <EditOutlined
                            className="ml-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEntry(subkey);
                              setIsEditingKey(true);
                              setNewKey(subkey);
                            }}
                          />
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {errors?.find((error) =>
                      error.instancePath.startsWith(`/${rootElement}/${subkey}`)
                    ) ? (
                      <WarningFilled className="text-yellow-400" />
                    ) : (
                      <CheckCircleFilled className="text-green-600" />
                    )}

                    {!campaignId && !loading && !readOnly && (
                      <DeleteOutlined
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();

                          setEditing(false);

                          const selectedTabAtoms = atomsMap[selectedRootElement];

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
                              [selectedRootElement]: {
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
                </button>
              );
            })}
            {!campaignId && !loading && !readOnly && (
              <button
                className="text-primary-8 flex h-[50px] min-h-[50px] w-90percent min-w-[150px] items-center justify-between rounded-full bg-gray-100 px-5 py-2 text-sm drop-shadow"
                type="button"
                onClick={() => {
                  setEditing(true);
                  setSelectedEntry('');
                }}
              >
                Add {rootElementSchema.singular_name ?? rootElementSchema.title ?? 'element'}
                <PlusCircleOutlined />
              </button>
            )}
          </>
        )}
    </>
  );
}
