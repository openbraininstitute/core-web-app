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
import { atom, useAtom } from 'jotai';
import { AnimatePresence, motion } from 'motion/react';
import { Fragment, memo, useMemo } from 'react';

import { fieldErrorsAtom } from '@/features/scan-config/components/hooks/field-errors';
import { useEntryDiff } from '@/features/scan-config/hooks/use-entry-diff';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import { isAtom, isPlainObject } from './utils';

import type { ErrorObject } from 'ajv';
import type React from 'react';
import type {
  AtomsMap,
  Config,
  ConfigValue,
  IBlockDictionary,
  TBlock,
} from '@/features/scan-config/types';
import type { ConfigHighlight } from '@/state/config-highlights';

import styles from './block-dictionary-entries.module.css';

function EntryTab({
  entryKey,
  isSelected,
  diffClass,
  displayName,
  onClick,
  children,
}: {
  entryKey: string;
  isSelected: boolean;
  diffClass?: string;
  displayName: string;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    /* biome-ignore lint/a11y/useSemanticElements: input cannot be nested inside button */
    <div
      role="button"
      key={entryKey}
      className={cn(
        'text-primary-8 flex h-12.5 min-h-12.5 min-w-37.5 items-center justify-between ',
        'rounded-full bg-gray-100 px-5 py-2 text-sm drop-shadow ',
        'hover:bg-linear-to-r hover:from-[#003A8C] hover:to-[#001026] hover:text-white gap-1',
        {
          'bg-linear-to-r from-[#003A8C] to-[#001026] text-white shadow-bnb': isSelected,
        },
        styles.entryButton,
        diffClass
      )}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(evt) => {
        if (evt.key === ' ' || evt.key === 'Enter') {
          onClick();
        }
      }}
    >
      {children ?? (
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center">
            <div className="inline-block truncate max-w-[24ch]">{displayName}</div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  setSelectedRootElement,
  singularName,
  allEntries,
  newKey,
  setNewKey,
  isEditingKey,
  setIsEditingKey,
  atomsMap,
  setAtomsMap,
  errors,
  highlights = [],
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
  setSelectedRootElement: (rootElement: string) => void;
  singularName: string;
  allEntries: Set<string>;
  newKey: string;
  setNewKey: (k: string) => void;
  isEditingKey: boolean;
  setIsEditingKey: (k: boolean) => void;
  atomsMap: AtomsMap;
  setAtomsMap: React.Dispatch<React.SetStateAction<AtomsMap>>;
  errors: ErrorObject<string, Record<string, any>, unknown>[] | null | undefined;
  highlights?: ConfigHighlight[];
  visible: boolean;
}) {
  const newKeyError = allEntries.has(newKey) || !newKey || newKey === selectedEntry;
  const [fieldErrors] = useAtom(fieldErrorsAtom);

  const configKeys = useMemo(
    () => new Set(Object.keys(config[rootElement] ?? {})),
    [config, rootElement]
  );
  const {
    getEntryDiffClass,
    deletedEntries: deletedEntriesFromHighlights,
    addedEntries: addedEntriesFromHighlights,
  } = useEntryDiff(rootElement, highlights, configKeys);

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
      atomsMap.initialize = atom<Record<string, ConfigValue | Array<ConfigValue>>>({
        ...configInitialize,
        node_set: { ...configInitialize.node_set, block_name: newKey },
      });
    }

    // Check all keys in the config
    Object.entries(config)
      .filter(([configK]) => configK !== 'initialize')
      .forEach(([configK, configV]) => {
        if (!isPlainObject(configV)) return;

        // Check all keys in a section (e.g stimuli, recordings)
        Object.entries(configV).forEach(([_, entryV]) => {
          if (!isPlainObject(entryV)) return;

          // Check all values in a particular object (a single stimuli, a single timestamp, etc)
          Object.entries(entryV).forEach(([fieldK, field]) => {
            if (
              !isPlainObject(entryV[fieldK]) ||
              !isPlainObject(field) ||
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
    const entryDiffClass = getEntryDiffClass(entry, isSelected);

    // Always use the raw config key — formatting (upperFirst/lowerCase)
    // would turn "my_node_name" into "My node name" which is wrong in diffs.
    const displayName = entry;

    return (
      <EntryTab
        key={entry}
        entryKey={entry}
        isSelected={isSelected}
        diffClass={entryDiffClass}
        displayName={displayName}
        onClick={() => handleEntryClick(entry)}
      />
    );
  }

  const deletedConfigKeys = new Set(deletedEntriesFromHighlights);

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
            {/* Render deleted entries first with red border */}
            {deletedEntriesFromHighlights.map((entry) => renderBlockTab(entry))}

            {/* Render added entries from highlights (restore flow, aiConfig may be null) */}
            {addedEntriesFromHighlights.map((entry) => renderBlockTab(entry))}

            {Object.entries(config[rootElement] ?? {})
              .filter(([block_key]) => {
                if (deletedConfigKeys.has(block_key)) return false;
                return true;
              })
              .map(([subkey, subValue]) => {
                const isSelected = selectedRootElement === rootElement && subkey === selectedEntry;
                const entryDiffClass = getEntryDiffClass(subkey, isSelected);

                return (
                  <Fragment key={subkey}>
                    <Tooltip>
                      <TooltipTrigger>
                        <EntryTab
                          entryKey={subkey}
                          isSelected={isSelected}
                          diffClass={entryDiffClass}
                          displayName={subkey}
                          onClick={() => handleEntryClick(subkey)}
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
                                {!readOnly &&
                                  !campaignId &&
                                  isChatReady &&
                                  highlights.length === 0 && (
                                    <EditOutlined
                                      className="ml-3"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedRootElement(rootElement);
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

                            {!campaignId &&
                              !loading &&
                              !readOnly &&
                              isChatReady &&
                              highlights.length === 0 && (
                                <DeleteOutlined
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    setEditing(false);

                                    const currentTabAtoms = atomsMap[rootElement];

                                    if (!isAtom(currentTabAtoms)) {
                                      delete currentTabAtoms[subkey];

                                      // Initialize case
                                      const configInitialize = config.initialize;
                                      if (
                                        isPlainObject(configInitialize) &&
                                        isPlainObject(configInitialize.node_set) &&
                                        typeof configInitialize.node_set.block_name === 'string' &&
                                        configInitialize.node_set.block_name === subkey
                                      ) {
                                        atomsMap.initialize = atom<
                                          Record<string, ConfigValue | Array<ConfigValue>>
                                        >({
                                          ...configInitialize,
                                          node_set: null,
                                        });
                                      }

                                      // Check all keys in the config
                                      Object.entries(config)
                                        .filter(([configK]) => configK !== 'initialize')
                                        .forEach(([configK, configV]) => {
                                          if (!isPlainObject(configV)) return;

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

                                              delete entryV[fieldK];

                                              // The atom that has a reference to current object
                                              atomsMap[configK][entryKey] =
                                                atom<
                                                  Record<string, ConfigValue | Array<ConfigValue>>
                                                >(entryV);
                                            });
                                          });
                                        });

                                      setAtomsMap({
                                        ...atomsMap,
                                        [selectedRootElement]: {
                                          ...currentTabAtoms,
                                        },
                                      });
                                    }

                                    setSelectedEntry('');
                                    allEntries.delete(subkey);
                                  }}
                                />
                              )}
                          </div>
                        </EntryTab>
                      </TooltipTrigger>
                      <TooltipContent
                        avoidCollisions
                        hideWhenDetached
                        align="end"
                        side="right"
                        className={cn(
                          'text-white shadow-bnb max-w-2xs min-w-2xs rounded-md ',
                          'bg-primary-8 px-4 py-2 text-base text-wrap ',
                          'overflow-y-auto max-h-50 primary-scrollbar'
                        )}
                        arrowClassName="bg-primary-8"
                      >
                        <div className="text-base">
                          <BlockDictionaryEntryTooltip
                            blockType={rootElementSchema.additionalProperties.oneOf.find((v) => {
                              if (!isPlainObject(subValue)) return null;
                              if (typeof subValue.type !== 'string') return null;

                              return v.properties.type.const === subValue.type;
                            })}
                          />
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </Fragment>
                );
              })}
          </div>

          {!campaignId && !loading && !readOnly && isChatReady && highlights.length === 0 && (
            <button
              className={cn(
                'text-primary-8 flex h-12.5 min-h-12.5 w-90percent min-w-37.5 items-center ',
                'justify-between rounded-full bg-gray-100 px-5 py-2 text-sm drop-shadow mt-1.5',
                'hover:bg-gray-100 hover:text-primary-8 hover:shadow-sm hover:[&_svg]:scale-125 transition-all ease-in-out'
              )}
              type="button"
              onClick={() => {
                setSelectedRootElement(rootElement);
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

const BlockDictionaryEntryTooltip = memo(
  ({ blockType }: { blockType?: TBlock }) => {
    if (!blockType) return null;
    return (
      <div className="flex flex-col gap-2">
        <div className="font-bold">{blockType.title}</div>
        <div className="max-w-2xs wrap-break-word">{blockType.description}</div>
      </div>
    );
  },
  (prevProps, props) => {
    return prevProps.blockType?.properties.type.const === props.blockType?.properties.type.const;
  }
);
