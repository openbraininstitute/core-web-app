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
import { lowerCase, upperFirst } from 'es-toolkit/compat';
import isEqual from 'es-toolkit/compat/isEqual';
import { AnimatePresence, motion } from 'framer-motion';
import { atom, useAtom } from 'jotai';
import { Fragment } from 'react';

import AIAdd from '@/components/icons/ai/add_icon';
import AIIcon from '@/components/icons/ai/ai_icon';
import AIEdit from '@/components/icons/ai/edit_icon';
import { fieldErrorsAtom } from '@/features/scan-config/components/hooks/field-errors';
import { cn } from '@/utils/css-class';

import { isAtom, isPlainObject } from './utils';

import type { ErrorObject } from 'ajv';
import type React from 'react';
import type { AtomsMap, Config, ConfigValue } from '@/features/scan-config/types';

export default function BlockDictionaryEntries({
  config,
  aiConfig,
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
}: {
  config: Config;
  aiConfig: Config | null;
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
  const [fieldErrors] = useAtom(fieldErrorsAtom);

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

  function renderBlockTab(entry: string) {
    const isSelected = selectedRootElement === rootElement && entry === selectedEntry;

    return (
      <button
        type="button"
        key={entry}
        className={cn(
          'text-primary-8 flex h-12.5 min-h-12.5 w-full min-w-37.5 items-center justify-between rounded-full ',
          'bg-gray-100 px-5 py-2 text-sm drop-shadow ',
          'hover:bg-linear-to-r hover:from-[#003A8C] hover:to-[#001026] hover:text-white',
          { 'bg-linear-to-r from-[#003A8C] to-[#001026] text-white': isSelected }
        )}
        tabIndex={0}
        onClick={() => handleEntryClick(entry)}
        onKeyDown={(evt) => {
          if (evt.key === ' ' || evt.key === 'Enter') {
            handleEntryClick(entry);
          }
        }}
      >
        <div className="w-full text-left truncate max-w-[24ch]">{upperFirst(lowerCase(entry))}</div>
        <AIIcon />
      </button>
    );
  }

  const aiAddedEntries = aiConfig
    ? Object.entries(aiConfig[rootElement])
        .filter(([block_key, _]) => {
          if (!isPlainObject(config[rootElement])) return false;
          const currentBlockConfig = config[rootElement][block_key];
          return !currentBlockConfig;
        })
        .map(([entry]) => renderBlockTab(entry))
    : [];

  const aiDeletedEntries = aiConfig
    ? Object.entries(config[rootElement])
        .filter(([block_key, _]) => {
          if (!aiConfig) return false;
          if (!isPlainObject(aiConfig[rootElement])) return false;
          const blockAIConfig = aiConfig[rootElement][block_key];
          return !blockAIConfig;
        })
        .map(([entry]) => renderBlockTab(entry))
    : [];

  const aiEditedEntries = aiConfig
    ? Object.entries(config[rootElement])
        .filter(([block_key, block_schema]) => {
          if (!aiConfig) return false;
          if (!isPlainObject(aiConfig[rootElement])) return false;
          const blockAIConfig = aiConfig[rootElement][block_key];
          return !!blockAIConfig && !isEqual(block_schema, blockAIConfig);
        })
        .map(([entry]) => renderBlockTab(entry))
    : [];

  const areThereAiEntries =
    !!aiConfig && [aiAddedEntries, aiDeletedEntries, aiEditedEntries].some((a) => a.length > 0);

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
          <div className="flex flex-col w-full gap-1.5 px-4">
            {Object.entries(config[rootElement])
              // We show only those that have no AI changes
              .filter(([block_key, block_schema]) => {
                if (!aiConfig) return true;
                if (!isPlainObject(aiConfig[rootElement])) return true;
                return isEqual(block_schema, aiConfig[rootElement][block_key]);
              })
              .map(([subkey]) => {
                const isSelected = selectedRootElement === rootElement && subkey === selectedEntry;

                return (
                  <Fragment key={subkey}>
                    {/* biome-ignore lint/a11y/useSemanticElements: input cannot be nested inside button */}
                    <div
                      role="button"
                      key={subkey}
                      className={cn(
                        'text-primary-8 flex h-12.5 min-h-12.5 min-w-37.5 items-center justify-between ',
                        'rounded-full bg-gray-100 px-5 py-2 text-sm drop-shadow ',
                        'hover:bg-linear-to-r hover:from-[#003A8C] hover:to-[#001026] hover:text-white gap-1',
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
                            {!readOnly && !campaignId && !aiConfig && isChatReady && (
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
                        ) ||
                        Array.from(fieldErrors.keys()).some((key) =>
                          key.startsWith(`${rootElement}/${subkey}`)
                        ) ? (
                          <WarningFilled className="text-yellow-400!" />
                        ) : (
                          <CheckCircleFilled className="text-green-600!" />
                        )}

                        {!campaignId && !loading && !readOnly && isChatReady && !aiConfig && (
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
                  </Fragment>
                );
              })}
          </div>
          {/* AI suggested changes */}

          {!campaignId && areThereAiEntries && (
            <div className="border-neutral-200 border rounded-lg w-90percent px-2 pb-4 pt-2 flex flex-col gap-2">
              {aiAddedEntries.length > 0 && (
                <div className="text-sm text-[#1690ff] flex items-center gap-1">
                  <AIAdd w={12} h={12} /> Added
                </div>
              )}

              {aiAddedEntries}

              {aiDeletedEntries.length > 0 && (
                <div className="text-sm text-red-500 flex items-center gap-1">
                  <CloseOutlined /> Deleted
                </div>
              )}

              {aiDeletedEntries}

              {aiEditedEntries.length > 0 && (
                <div className="flex items-center gap-1">
                  <AIEdit />
                  <span className="text-sm bg-linear-to-r from-[#ef4444] to-[#1690ff] bg-clip-text text-transparent">
                    Edited
                  </span>
                </div>
              )}
              {aiEditedEntries}
            </div>
          )}

          {!campaignId && !loading && !readOnly && isChatReady && !aiConfig && (
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
