import { CheckCircleFilled, WarningFilled } from '@ant-design/icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { lowerCase, upperFirst } from 'es-toolkit/compat';

import BlockDictionaryEntries from '@/features/scan-config/components/block-dictionary-entries';
import { Chevron, type Config, LeftMenuTab } from '@/features/scan-config/components/components';
import { isRootBlock } from '@/features/scan-config/components/hooks/schema';
import { isPlainObject } from '@/features/scan-config/components/utils';
import {
  type AtomsMap,
  type ConfigSchema,
  type IBlockDictionary,
  type IBlockSingle,
  type IRootBlockUnion,
  isType,
  ScanConfigUIElementDict,
  type TBlock,
} from '@/features/scan-config/types';
import { useAIConfig } from '@/services/ai-agent';
import { activeFlashesAtom, configHighlightsAtom, expandedRootElementsAtom } from '@/state/config-highlights';
import { cn } from '@/utils/css-class';
import { getDiffClassName } from '@/utils/diff-class';

import type { DiffType } from '@/utils/diff';
import type { ErrorObject } from 'ajv';
import type React from 'react';

import styles from './root-element.module.css';

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
  rootElementSchema: IBlockSingle | IBlockDictionary | IRootBlockUnion;
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
  const { aiConfig, isChatReady } = useAIConfig();
  const highlights = useAtomValue(configHighlightsAtom);
  const expandedRootElements = useAtomValue(expandedRootElementsAtom);
  const setExpandedRootElements = useSetAtom(expandedRootElementsAtom);
  const activeFlashes = useAtomValue(activeFlashesAtom);
  
  // Check if this block should be expanded (driven solely by the expanded set)
  const isExpanded = expandedRootElements.has(rootElement);
  
  // Read flash state from shared atom — presence in map = flash, no TTL check
  const activeFlash = activeFlashes.get(rootElement);
  const shouldFlash = !!activeFlash;
  const flashType = activeFlash?.rootFlashType ?? 'replace';
  
  if (!schema || !schema?.properties) return;

  // Check if this root element has any highlights
  const hasHighlights = highlights.some((h) => h.path[0] === rootElement);
  
  // Determine the dominant highlight type for this root element
  const rootHighlightTypes = new Set(
    highlights.filter((h) => h.path[0] === rootElement).map((h) => h.type)
  );
  const resolvedHighlightType: DiffType | null = !hasHighlights
    ? null
    : rootHighlightTypes.size > 1 || rootHighlightTypes.has('replace')
      ? 'replace'
      : rootHighlightTypes.has('add')
        ? 'add'
        : 'remove';

  // Pick the right CSS class: flash takes priority over static highlight
  const diffClass = shouldFlash
    ? getDiffClassName(flashType, 'flash-slow')
    : getDiffClassName(resolvedHighlightType, 'highlight');

  const handleEntryClick = (subkey: string) => {
    setSelectedRootElement(rootElement); // Select the parent block
    setSelectedEntry(subkey);
    setEditing(true);
    setIsEditingKey(false);
    setNewKey('');
  };

  return (
    <div className="w-full flex flex-col gap-0.5">
      <LeftMenuTab
        tab={rootElement}
        selectedTab={selectedRootElement}
        onClick={() => {
          const isCollapseClick =
            selectedRootElement === rootElement &&
            !isRootBlock(schema, rootElement) &&
            rootElementSchema.ui_element !== ScanConfigUIElementDict.BlockUnion;

          // for block_dictionary, clicking again collapses it
          // for ScanConfigUIElementDict.BlockSingle and ScanConfigUIElementDict.BlockUnion, they stay open
          if (isCollapseClick) {
            setEditing(false);
            setSelectedEntry('');

            // Toggle expansion
            if (expandedRootElements.has(rootElement)) {
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
            setEditing(false);
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
          "w-full flex text-left justify-between min-h-[50px] items-center drop-shadow ml-0.5",
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
        <div className="flex gap-3">
          {errors?.find((error) => error.instancePath.startsWith(`/${rootElement}`)) ? (
            <WarningFilled className="text-yellow-400!" />
          ) : (
            <CheckCircleFilled className="text-green-600!" />
          )}

          <Chevron
            rotate={
              rootElementSchema.ui_element === ScanConfigUIElementDict.BlockDictionary ? 90 : 0
            }
          />
        </div>
      </LeftMenuTab>

      {rootElementSchema.ui_element === ScanConfigUIElementDict.BlockDictionary &&
        (config[rootElement] || hasHighlights) && (
          <BlockDictionaryEntries
          config={config}
          aiConfig={aiConfig}
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
          singularName={rootElementSchema.singular_name}
          allEntries={allEntries}
          newKey={newKey}
          setNewKey={setNewKey}
          isEditingKey={isEditingKey}
          setIsEditingKey={setIsEditingKey}
          atomsMap={atomsMap}
          setAtomsMap={setAtomsMap}
          errors={errors}
          highlights={highlights}
          visible={isExpanded}
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
  rootElementSchema: IBlockSingle | IBlockDictionary | IRootBlockUnion;
  config: Config;
  rootElement: string;
  fallbackTitle?: string;
}) {
  if (rootElementSchema.ui_element !== ScanConfigUIElementDict.BlockUnion)
    return upperFirst(lowerCase(fallbackTitle));

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

  return upperFirst(lowerCase(selectedVariant?.title ?? fallbackTitle));
}
