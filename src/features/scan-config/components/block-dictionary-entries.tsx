import {
  CheckCircleFilled,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusCircleOutlined,
  WarningFilled,
} from '@ant-design/icons';
import { Input } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { atom } from 'jotai';
import { isPageStatic } from 'next/dist/build/utils';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import { isAtom, isPlainObject } from './utils';

import type { ErrorObject } from 'ajv';
import type React from 'react';
import type { AtomsMap, Config, ConfigValue, IBlockDictionary } from '@/features/scan-config/types';

export default function BlockDictionaryEntries({
  config,
  rootElement,
  selectedEntry,
  selectedRootElement,
  handleEntryClick,
  campaignId,
  loading,
  readOnly,
  isChatReady,
  setEditing,
  setSelectedEntry,
  singularName,
  allEntries,
  newKey,
  setNewKey,
  isEditingKey,
  setIsEditingKey,
  atomsMap,
  setAtomsMap,
  errors,
  visible,
  rootElementSchema,
}: {
  config: Config;
  rootElementSchema: IBlockDictionary;
  rootElement: string;
  selectedEntry: string;
  selectedRootElement: string;
  handleEntryClick: (entry: string) => void;
  campaignId: string;
  loading: boolean;
  readOnly: boolean;
  isChatReady: boolean;
  setEditing: (editing: boolean) => void;
  setSelectedEntry: (entry: string) => void;
  singularName: string;
  allEntries: Set<string>;
  newKey: string;
  setNewKey: (k: string) => void;
  isEditingKey: boolean;
  setIsEditingKey: (k: boolean) => void;
  atomsMap: AtomsMap;
  setAtomsMap: React.Dispatch<React.SetStateAction<AtomsMap>>;
  errors: ErrorObject<string, Record<string, any>, unknown>[] | null | undefined;
  visible: boolean;
}) {
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

  console.log(rootElementSchema);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-scan-config-menu="menu-block-dictionary-sub-entry"
          data-active={visible}
          key={rootElement}
          initial={{ y: -10, opacity: 0, height: 0, marginBottom: -12 }}
          animate={{ y: 0, opacity: 1, height: 'auto', marginBottom: 0 }}
          exit={{
            y: -10,
            height: 0,
            marginBottom: -12,
            opacity: 0,
          }}
          transition={{ duration: 0.3, ease: 'linear' }}
          className={cn('flex flex-col w-full items-center z-0 mb-4!')}
        >
          <div className="flex flex-col w-full px-4">
            {Object.entries(config[rootElement]).map(([subkey, subValue]) => {
              const isSelected = selectedRootElement === rootElement && subkey === selectedEntry;

              return (
                <Tooltip key={subkey}>
                  <TooltipTrigger>
                    {/* biome-ignore lint/a11y/useSemanticElements: input cannot be nested inside button */}
                    <div
                      role="button"
                      key={subkey}
                      className={cn(
                        'text-primary-8 flex flex-col h-15 min-h-12.5 min-w-37.5',
                        'rounded-full bg-gray-100 px-5 py-2 text-sm drop-shadow ',
                        'hover:bg-linear-to-r hover:from-[#003A8C] hover:to-[#001026] hover:text-white mb-3',
                        {
                          'bg-linear-to-r from-[#003A8C] to-[#001026] text-white shadow-bnb':
                            isSelected,
                        }
                      )}
                      tabIndex={0}
                      onClick={() => handleEntryClick(subkey)}
                      onKeyDown={(evt) => {
                        if (evt.key === ' ' || evt.key === 'Enter') {
                          handleEntryClick(subkey);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex-1 min-w-0 text-left">
                          {isSelected && isEditingKey && !readOnly && (
                            <>
                              <Input
                                value={newKey}
                                className="inline-block h-5 w-[70%] text-sm outline-none"
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
                                maxLength={24}
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
                            <div className="flex items-center">
                              <div className="inline-block truncate max-w-[24ch]">{subkey}</div>
                              {!readOnly && !campaignId && isChatReady && (
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
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 text-[14px]">
                          {errors?.find((error) =>
                            error.instancePath.startsWith(`/${rootElement}/${subkey}`)
                          ) ? (
                            <WarningFilled className="text-yellow-400!" />
                          ) : (
                            <CheckCircleFilled className="text-green-600!" />
                          )}

                          {!campaignId && !loading && !readOnly && isChatReady && (
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
                      </div>

                      <div className="flex justify">
                        {isPlainObject(subValue) &&
                          typeof subValue.type === 'string' &&
                          subValue.type}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="text-base">
                      {
                        rootElementSchema.additionalProperties.oneOf.find((v) => {
                          if (!isPlainObject(subValue)) return null;
                          if (typeof subValue.type !== 'string') return null;

                          return v.properties.type.const === subValue.type;
                        })?.description
                      }
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {!campaignId && !loading && !readOnly && isChatReady && (
            <button
              className={cn(
                'text-primary-8 flex h-12.5 min-h-12.5 w-90percent min-w-37.5 items-center ',
                'justify-between rounded-full bg-gray-100 px-5 py-2 text-sm drop-shadow mt-1.5',
                'hover:bg-gray-100 hover:text-primary-8 hover:shadow-sm hover:[&_svg]:scale-125 transition-all ease-in-out'
              )}
              type="button"
              onClick={() => {
                setEditing(true);
                setSelectedEntry('');
              }}
            >
              <span>
                Add <span className="lowercase">{singularName}</span>
              </span>
              <PlusCircleOutlined />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
