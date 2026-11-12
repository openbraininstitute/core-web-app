import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  WarningFilled,
} from '@ant-design/icons';
import { Input } from 'antd';
import { kebabCase } from 'es-toolkit/compat';
import { AnimatePresence, motion } from 'motion/react';
import { Fragment, memo, useEffect, useMemo, useRef } from 'react';

import { useFieldErrors } from '@/features/scan-config/components/hooks/field-errors';
import { DESCRIPTION_TOOLTIP_CLASS } from '@/features/scan-config/components/shared/box-class';
import {
  DISTANCE_DISTRIBUTIONS_KEY,
  remapParameterDistributions,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import { clearDeletedBlockReferences } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/circuit/state';
import { useEntryDiff } from '@/features/scan-config/hooks/use-entry-diff';
import { MarkdownDescription } from '@/ui/molecules/markdown-description';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import { RewriteBlockReferencesModeDict, rewriteBlockReferences } from './rewrite-block-references';
import { isPlainObject } from './utils';

import type { ErrorObject } from 'ajv';
import type { InputRef } from 'antd';
import type React from 'react';
import type { Config, ConfigSchema, IBlockDictionary, TBlock } from '@/features/scan-config/types';
import type { ConfigHighlight } from '@/state/config-highlights';

import styles from './block-dictionary-entries.module.css';

/** An entry's own actions: shown only while the pointer is over the entry, or it has keyboard focus. */
const ENTRY_ACTION_CLASS = 'invisible group-hover/entry:visible group-focus-visible/entry:visible';

type EntryTabProps = Omit<React.ComponentProps<'div'>, 'onClick'> & {
  entryKey: string;
  isSelected: boolean;
  diffClass?: string;
  displayName: string;
  onClick: (event?: React.MouseEvent<HTMLDivElement>) => void;
};

/**
 * The tab element. Forwards `ref` and arbitrary DOM props so it can be the child of an
 * `asChild` Radix trigger rather than being wrapped in the trigger's own `<button>`.
 */
function EntryTab({
  entryKey,
  isSelected,
  diffClass,
  displayName,
  onClick,
  onKeyDown,
  className,
  children,
  ref,
  ...props
}: EntryTabProps) {
  return (
    /* biome-ignore lint/a11y/useSemanticElements: input cannot be nested inside button */
    <div
      role="button"
      id={`${kebabCase(entryKey)}-menu-block-dictionary-sub-entry__item`}
      tabIndex={0}
      {...props}
      ref={ref}
      className={cn(
        'group/entry text-primary-8 flex h-12.5 min-h-12.5 min-w-37.5 items-center justify-between ',
        'rounded-full bg-gray-100 px-5 py-2 text-sm drop-shadow ',
        'hover:bg-linear-to-r hover:from-[#003A8C] hover:to-primary-10 hover:text-white gap-1',
        {
          'bg-linear-to-r from-[#003A8C] to-primary-10 text-white shadow-bnb': isSelected,
        },
        styles.entryButton,
        diffClass,
        className
      )}
      onClick={(evt) => onClick(evt)}
      onKeyDown={(evt) => {
        onKeyDown?.(evt);
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
  setConfig,
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
  errors,
  highlights = [],
  visible,
  rootElementSchema,
  schema,
}: {
  config: Config;
  setConfig: (newConfig: Config) => void;
  schema: ConfigSchema;
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
  errors: ErrorObject<string, Record<string, any>, unknown>[] | null | undefined;
  highlights?: ConfigHighlight[];
  visible: boolean;
}) {
  const newKeyError = allEntries.has(newKey) || !newKey || newKey === selectedEntry;
  const fieldErrors = useFieldErrors();

  const renameInputRef = useRef<InputRef>(null);
  // Keying the focus effect off the renamed entry (not `isEditingKey`) refocuses only
  // when rename mode opens or moves to a different entry, not on every commit.
  const renamingEntryKey =
    isEditingKey && !readOnly && selectedRootElement === rootElement ? selectedEntry : null;

  useEffect(() => {
    if (!renamingEntryKey) return;
    renameInputRef.current?.focus();
  }, [renamingEntryKey]);

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
    if (newKey === selectedEntry) return;
    if (!isPlainObject(config[selectedRootElement])) return;

    const newConfig = structuredClone(config);
    const targetSection = newConfig[selectedRootElement];

    allEntries.delete(selectedEntry);
    allEntries.add(newKey);

    if (!isPlainObject(targetSection)) return;

    const targetSectionRenamed = Object.fromEntries(
      Object.entries(targetSection).map(([k, v]) => (k === selectedEntry ? [newKey, v] : [k, v]))
    );

    newConfig[selectedRootElement] = targetSectionRenamed;

    const initConfig = newConfig.initialize;
    if (
      isPlainObject(initConfig) &&
      isPlainObject(initConfig.node_set) &&
      typeof initConfig.node_set.block_name === 'string' &&
      initConfig.node_set.block_name === selectedEntry
    ) {
      initConfig.node_set.block_name = newKey;
    }

    Object.entries(newConfig).forEach(([configK, configV]) => {
      if (configK === 'initialize' || !isPlainObject(configV)) return;

      // Rename refs in section entries (incl. nested combination tuples)
      Object.values(configV).forEach((entryV) => {
        rewriteBlockReferences(entryV, selectedEntry, {
          type: RewriteBlockReferencesModeDict.Rename,
          to: newKey,
        });
      });
    });

    // Distributions are referenced by plain string in each parameter's `distribution`, not via
    // block references, so cascade the rename into every parameter that uses the old name.
    const afterRename =
      selectedRootElement === DISTANCE_DISTRIBUTIONS_KEY
        ? remapParameterDistributions(newConfig, schema, selectedEntry, newKey)
        : newConfig;

    setConfig(afterRename);

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
          data-scan-config-menu={`${rootElement}-menu-block-dictionary-sub-entry`}
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
          className={cn('flex flex-col w-full z-0 mb-4!')}
        >
          {/* Hung off a rule under the open dictionary, as an open file group's files are. */}
          <div className="border-neutral-2 mt-1.5 ml-4 flex flex-col gap-1.5 border-l pl-3">
            <div
              id={`${rootElement}-menu-block-dictionary-sub-entry__container`}
              className="flex flex-col w-full gap-1.5"
            >
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
                  const isSelected =
                    selectedRootElement === rootElement && subkey === selectedEntry;
                  const entryDiffClass = getEntryDiffClass(subkey, isSelected);

                  return (
                    <Fragment key={subkey}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <EntryTab
                            data-testid={`scan-config-entry-${rootElement}-${subkey}`}
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
                                    ref={renameInputRef}
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
                                </div>
                              )}
                            </div>

                            {/* Rename and delete at the pill's end, left of a warning where the entry
                                has one: an entry that is fine needs no tick. */}
                            <div className="flex items-center gap-2 text-[14px]">
                              {!readOnly &&
                                !campaignId &&
                                isChatReady &&
                                highlights.length === 0 &&
                                !(isSelected && isEditingKey) && (
                                  <EditOutlined
                                    className={ENTRY_ACTION_CLASS}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedRootElement(rootElement);
                                      setSelectedEntry(subkey);
                                      setIsEditingKey(true);
                                      setNewKey(subkey);
                                    }}
                                  />
                                )}

                              {!campaignId &&
                                !loading &&
                                !readOnly &&
                                isChatReady &&
                                highlights.length === 0 && (
                                  <DeleteOutlined
                                    className={cn('cursor-pointer', ENTRY_ACTION_CLASS)}
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();

                                      setEditing(false);
                                      setSelectedRootElement(rootElement);

                                      if (!isPlainObject(config[rootElement])) return;

                                      const newConfig = structuredClone(config);
                                      const targetSection = newConfig[rootElement];

                                      if (!isPlainObject(targetSection)) return;

                                      delete targetSection[subkey];

                                      // Schema-aware cleanup: clear refs + dependent manipulation fields
                                      const cleaned = clearDeletedBlockReferences(
                                        newConfig,
                                        schema,
                                        rootElement,
                                        subkey
                                      );

                                      // Also clear nested refs (e.g. combination tuples)
                                      Object.entries(cleaned).forEach(([configK, configV]) => {
                                        if (configK === 'initialize' || !isPlainObject(configV))
                                          return;

                                        Object.values(configV).forEach((entryV) => {
                                          rewriteBlockReferences(entryV, subkey, {
                                            type: RewriteBlockReferencesModeDict.Clear,
                                          });
                                        });
                                      });

                                      // Distributions are referenced by plain string, so reset any
                                      // parameter using the deleted distribution back to uniform.
                                      const afterDelete =
                                        rootElement === DISTANCE_DISTRIBUTIONS_KEY
                                          ? remapParameterDistributions(
                                              cleaned,
                                              schema,
                                              subkey,
                                              null
                                            )
                                          : cleaned;

                                      setConfig(afterDelete);

                                      setSelectedEntry('');
                                      allEntries.delete(subkey);
                                    }}
                                  />
                                )}

                              {(errors?.some((error) =>
                                error.instancePath.startsWith(`/${rootElement}/${subkey}`)
                              ) ||
                                Array.from(fieldErrors.keys()).some((key) =>
                                  key.startsWith(`${rootElement}/${subkey}`)
                                )) && <WarningFilled className="text-yellow-400!" />}
                            </div>
                          </EntryTab>
                        </TooltipTrigger>
                        <TooltipContent
                          avoidCollisions
                          hideWhenDetached
                          align="end"
                          side="right"
                          showArrow={false}
                          className={DESCRIPTION_TOOLTIP_CLASS}
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
                data-testid={`scan-config-add-entry-${rootElement}`}
                // Set apart from the entries over it: outlined in navy round a navy plus.
                className={cn(
                  'group/add text-primary-9 flex h-12.5 min-h-12.5 w-full min-w-37.5 items-center ',
                  'justify-between rounded-full border-2 border-primary-9/35 bg-white px-5 py-2 text-sm font-semibold',
                  'hover:border-primary-9 hover:bg-primary-9/5 transition-colors ease-in-out'
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
                <span className="bg-primary-9 flex size-6 shrink-0 items-center justify-center rounded-full text-white transition-transform group-hover/add:scale-110">
                  <PlusOutlined className="text-xs" />
                </span>
              </button>
            )}
          </div>
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
        <MarkdownDescription className="max-w-2xs">{blockType.description}</MarkdownDescription>
      </div>
    );
  },
  (prevProps, props) => {
    return prevProps.blockType?.properties.type.const === props.blockType?.properties.type.const;
  }
);
