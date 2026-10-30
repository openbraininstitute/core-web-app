import { WarningFilled } from '@ant-design/icons';
import { useSetAtom } from 'jotai';

import BlockDictionaryEntries from '@/features/scan-config/components/block-dictionary-entries';
import { Chevron, CountBadge, LeftMenuTab } from '@/features/scan-config/components/components';
import { EModelOptimisationMechanismsTabList } from '@/features/scan-config/components/emodel-optimisation-mechanisms-tabs';
import { useFieldErrorsForPath } from '@/features/scan-config/components/hooks/field-errors';
import { isRootBlock } from '@/features/scan-config/components/hooks/schema';
import { DESCRIPTION_TOOLTIP_CLASS } from '@/features/scan-config/components/shared/box-class';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { useRootElementDiff } from '@/features/scan-config/hooks/use-root-element-diff';
import {
  type Config,
  type ConfigSchema,
  type IBlockDictionary,
  type IBlockSingle,
  type IEModelOptimisationParameters,
  type IRootBlockUnion,
  isType,
  ScanConfigUIElementDict,
  type TBlock,
} from '@/features/scan-config/types';
import { useAIConfig } from '@/services/ai-agent';
import { expandedRootElementsAtom } from '@/state/config-highlights';
import { MarkdownDescription } from '@/ui/molecules/markdown-description';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { ErrorObject } from 'ajv';
import type React from 'react';

import styles from './root-element.module.css';

export function RootElement({
  schema,
  rootElement,
  rootElementSchema,
  selectedRootElement,
  setSelectedRootElement,
  config,
  setConfig,
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
  selectedMechanismsTab,
  setSelectedMechanismsTab,
}: {
  schema: ConfigSchema | null; // The global schema
  rootElement: string;
  rootElementSchema:
    | IBlockSingle
    | IBlockDictionary
    | IRootBlockUnion
    | IEModelOptimisationParameters;
  selectedRootElement: string;
  setSelectedRootElement: (configTab: string) => void;
  config: Config;
  setConfig: (newConfig: Config) => void;
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
  selectedMechanismsTab: string;
  setSelectedMechanismsTab: (tab: string) => void;
}) {
  const { isChatReady } = useAIConfig();
  const setExpandedRootElements = useSetAtom(expandedRootElementsAtom);
  const { highlights, hasHighlights, isExpanded, diffClass } = useRootElementDiff(rootElement);
  const hasFieldErrors = useFieldErrorsForPath(rootElement);
  const isSelected = selectedRootElement === rootElement;
  const isBlockDictionary =
    rootElementSchema.ui_element === ScanConfigUIElementDict.BlockDictionary;
  const entries = isPlainObject(config[rootElement]) ? (config[rootElement] as object) : {};
  // only a dictionary holds sub-entries; the count is what it currently holds
  const entryCount = isBlockDictionary ? Object.keys(entries).length : null;
  // The block picked is one of this dictionary's own.
  const holdsSelected = isSelected && !!selectedEntry && selectedEntry in entries;
  // A dictionary is lit only while shut on the block picked: open, that block is lit instead.
  const lit = isBlockDictionary ? holdsSelected && !isExpanded : isSelected;

  if (!schema?.properties) return;

  const handleEntryClick = (subkey: string) => {
    setSelectedRootElement(rootElement); // Select the parent block
    setSelectedEntry(subkey);
    setEditing(true);
    setIsEditingKey(false);
    setNewKey('');
  };

  return (
    <div className="w-full flex flex-col gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <LeftMenuTab
              tab={rootElement}
              testId={`scan-config-root-element-${rootElement}`}
              selectedTab={selectedRootElement}
              selected={lit}
              onClick={() => {
                // emodel_optimisation_parameters: always expanded, keeps its inner tab
                if (
                  rootElementSchema.ui_element ===
                  ScanConfigUIElementDict.EModelOptimisationParameters
                ) {
                  setSelectedRootElement(rootElement);
                  setSelectedEntry('');
                  setEditing(true);
                  return;
                }

                const isDictionary =
                  !isRootBlock(schema, rootElement) &&
                  rootElementSchema.ui_element !== ScanConfigUIElementDict.BlockUnion;

                // BlockDictionary: always toggle expand/collapse on click,
                // regardless of whether this root element is currently selected.
                if (isDictionary) {
                  // The block picked stays picked, its form open, as its own dictionary opens or shuts.
                  if (!holdsSelected) {
                    setSelectedRootElement(rootElement);
                    setSelectedEntry('');
                    setEditing(false);
                  }

                  if (isExpanded) {
                    setExpandedRootElements((prev) => {
                      const newSet = new Set(prev);
                      newSet.delete(rootElement);
                      return newSet;
                    });
                  } else {
                    setExpandedRootElements((prev) => {
                      const newSet = new Set(prev);
                      newSet.add(rootElement);
                      return newSet;
                    });
                  }
                  return;
                }

                // Open: add to expanded set and select
                setExpandedRootElements((prev) => {
                  const newSet = new Set(prev);
                  newSet.add(rootElement);
                  return newSet;
                });

                setSelectedRootElement(rootElement);
                setSelectedEntry('');

                if (
                  rootElementSchema.ui_element === ScanConfigUIElementDict.BlockSingle ||
                  rootElementSchema.ui_element === ScanConfigUIElementDict.BlockUnion
                )
                  setEditing(true);
                else setEditing(false);
              }}
              extraClass={cn(
                'w-full flex text-left justify-between min-h-[50px] items-center drop-shadow ml-0.5',
                styles.rootBase,
                diffClass
              )}
              style={undefined}
            >
              <span className="flex items-center gap-2 wrap-break-word min-w-0">
                <SelectedUnionVariantLabel
                  rootElementSchema={rootElementSchema}
                  config={config}
                  rootElement={rootElement}
                  fallbackTitle={schema.properties?.[rootElement]?.title}
                />
              </span>
              <div className="flex items-center gap-3">
                {entryCount ? <CountBadge count={entryCount} selected={lit} /> : null}

                {/* A warning where the block has a problem; one that is fine needs no tick. */}
                {(errors?.some((error) => error.instancePath.startsWith(`/${rootElement}`)) ||
                  hasFieldErrors) && <WarningFilled className="text-yellow-400!" />}

                <Chevron
                  // A dictionary's points down while open; the e-model's is never shut.
                  rotate={
                    (isBlockDictionary && isExpanded) ||
                    rootElementSchema.ui_element ===
                      ScanConfigUIElementDict.EModelOptimisationParameters
                      ? 90
                      : 0
                  }
                />
              </div>
            </LeftMenuTab>
          </span>
        </TooltipTrigger>
        <TooltipContent
          avoidCollisions
          hideWhenDetached
          align="center"
          side="right"
          showArrow={false}
          className={DESCRIPTION_TOOLTIP_CLASS}
        >
          <MarkdownDescription>{rootElementSchema.description}</MarkdownDescription>
        </TooltipContent>
      </Tooltip>

      {rootElementSchema.ui_element === ScanConfigUIElementDict.EModelOptimisationParameters && (
        <EModelOptimisationMechanismsTabList
          rootElement={rootElement}
          selectedRootElement={selectedRootElement}
          selectedMechanismsTab={selectedMechanismsTab}
          onSelectTab={(key) => {
            setSelectedRootElement(rootElement);
            setSelectedMechanismsTab(key);
            setEditing(true);
          }}
          value={config[rootElement]}
          errors={errors}
        />
      )}

      {rootElementSchema.ui_element === ScanConfigUIElementDict.BlockDictionary &&
        (config[rootElement] || hasHighlights) && (
          <BlockDictionaryEntries
            schema={schema}
            config={config}
            setConfig={setConfig}
            rootElement={rootElement}
            selectedEntry={selectedEntry}
            selectedRootElement={selectedRootElement}
            handleEntryClick={handleEntryClick}
            campaignId={campaignId}
            loading={loading}
            readOnly={!!readOnly}
            isChatReady={isChatReady}
            setEditing={setEditing}
            setSelectedEntry={setSelectedEntry}
            setSelectedRootElement={setSelectedRootElement}
            singularName={rootElementSchema.singular_name}
            allEntries={allEntries}
            newKey={newKey}
            setNewKey={setNewKey}
            isEditingKey={isEditingKey}
            setIsEditingKey={setIsEditingKey}
            errors={errors}
            highlights={highlights}
            visible={isExpanded}
            rootElementSchema={rootElementSchema}
          />
        )}
    </div>
  );
}

function SelectedUnionVariantLabel({
  rootElementSchema,
  config,
  rootElement,
  fallbackTitle,
}: {
  rootElementSchema:
    | IBlockSingle
    | IBlockDictionary
    | IRootBlockUnion
    | IEModelOptimisationParameters;
  config: Config;
  rootElement: string;
  fallbackTitle?: string;
}) {
  if (rootElementSchema.ui_element !== ScanConfigUIElementDict.BlockUnion) return fallbackTitle;

  const unionSchema = rootElementSchema as IRootBlockUnion;
  const discriminatorProp = unionSchema.discriminator
    ? typeof unionSchema.discriminator === 'string'
      ? unionSchema.discriminator
      : (unionSchema.discriminator.propertyName ?? 'type')
    : 'type';
  const currentConfig = config[rootElement];
  const selectedType =
    isPlainObject(currentConfig) && typeof currentConfig[discriminatorProp] === 'string'
      ? currentConfig[discriminatorProp]
      : undefined;
  const selectedVariant = selectedType
    ? unionSchema.oneOf.find((o: TBlock) => {
        const typeProp = o.properties?.[discriminatorProp];
        return typeProp && isType(typeProp) && typeProp.const === selectedType;
      })
    : undefined;

  return selectedVariant?.title ?? fallbackTitle;
}
