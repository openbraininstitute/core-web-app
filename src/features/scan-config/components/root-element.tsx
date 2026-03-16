import { CheckCircleFilled, WarningFilled } from '@ant-design/icons';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { lowerCase, upperFirst } from 'es-toolkit/compat';
import { useEffect, useRef } from 'react';

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

import type { ErrorObject } from 'ajv';
import type React from 'react';

import styles from './root-element.module.css';

interface JSONPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: any;
  from?: string;
}

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
  const [activeFlashes, setActiveFlashes] = useAtom(activeFlashesAtom);
  
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const expandedRef = useRef(expandedRootElements);
  expandedRef.current = expandedRootElements;
  
  // Check if this block should be expanded (either selected OR in the expanded set)
  const isExpanded = selectedRootElement === rootElement || expandedRootElements.has(rootElement);
  
  // Read flash state from shared atom — presence in map = flash, no TTL check
  const activeFlash = activeFlashes.get(rootElement);
  const shouldFlash = !!activeFlash;
  const flashType = activeFlash?.rootFlashType ?? 'replace';
  
  // Listen for config updates from the chat
  useEffect(() => {
    const handleConfigUpdate = (event: CustomEvent<{ patches: JSONPatchOperation[] }>) => {
      const { patches } = event.detail;
      
      // Check if any patch affects this root element
      const affectsThisBlock = patches.some((patch) => {
        const pathParts = patch.path.split('/').filter(Boolean);
        const adjustedPath = pathParts[0] === 'smc_simulation_config' ? pathParts.slice(1) : pathParts;
        return adjustedPath[0] === rootElement;
      });
      
      if (affectsThisBlock) {
        // Expand this block if collapsed
        if (!expandedRef.current.has(rootElement)) {
          setExpandedRootElements((prev) => {
            const newSet = new Set(prev);
            newSet.add(rootElement);
            return newSet;
          });
        }
        
        // Determine the operation type for this block
        const blockPatches = patches.filter((patch) => {
          const pathParts = patch.path.split('/').filter(Boolean);
          const adjustedPath = pathParts[0] === 'smc_simulation_config' ? pathParts.slice(1) : pathParts;
          return adjustedPath[0] === rootElement;
        });
        
        const hasAdd = blockPatches.some((p) => p.op === 'add');
        const hasRemove = blockPatches.some((p) => p.op === 'remove');
        const hasReplace = blockPatches.some((p) => p.op === 'replace');
        
        const operationType = hasAdd && !hasRemove && !hasReplace 
          ? 'add' as const
          : hasRemove && !hasAdd && !hasReplace
          ? 'remove' as const
          : 'replace' as const;
        
        // Build entries map for children
        const entries = new Map<string, { type: 'add' | 'remove' | 'replace' }>();
        blockPatches.forEach((patch) => {
          const pathParts = patch.path.split('/').filter(Boolean);
          const adjustedPath = pathParts[0] === 'smc_simulation_config' ? pathParts.slice(1) : pathParts;
          if (adjustedPath.length >= 2) {
            const entryName = adjustedPath[1];
            const existing = entries.get(entryName);
            if (existing && existing.type !== patch.op) {
              entries.set(entryName, { type: 'replace' });
            } else if (!existing) {
              entries.set(entryName, { type: patch.op as 'add' | 'remove' | 'replace' });
            }
          }
        });
        
        const flashData = { rootFlashType: operationType, entries };
        
        // Write flash state to shared atom synchronously.
        // Even if children aren't mounted yet (parent was collapsed),
        // they'll read this value when they mount since Jotai atoms are global.
        setActiveFlashes((prev) => {
          const newMap = new Map(prev);
          newMap.set(rootElement, flashData);
          return newMap;
        });
        
        // Clear flash after animation completes
        if (flashTimeoutRef.current) {
          clearTimeout(flashTimeoutRef.current);
        }
        flashTimeoutRef.current = setTimeout(() => {
          setActiveFlashes((prev) => {
            const newMap = new Map(prev);
            newMap.delete(rootElement);
            return newMap;
          });
        }, 1300);
      }
    };
    
    window.addEventListener('config-updated', handleConfigUpdate as EventListener);
    
    return () => {
      window.removeEventListener('config-updated', handleConfigUpdate as EventListener);
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, [rootElement, setExpandedRootElements, setActiveFlashes]);
  
  if (!schema || !schema?.properties) return;

  // Check if this root element has any highlights
  const hasHighlights = highlights.some((h) => h.path[0] === rootElement);
  
  // Determine highlight type based on operation types
  // If there are multiple different types of changes, show as "edited" (yellow/amber)
  const rootHighlightTypes = new Set(
    highlights.filter((h) => h.path[0] === rootElement).map((h) => h.type)
  );

  const handleEntryClick = (subkey: string) => {
    setSelectedRootElement(rootElement); // Select the parent block
    setSelectedEntry(subkey);
    setEditing(true);
    setIsEditingKey(false);
    setNewKey('');
  };

  return (
    <>
      <LeftMenuTab
        tab={rootElement}
        selectedTab={selectedRootElement}
        onClick={() => {
          // For dictionary blocks, toggle expansion on click
          if (!isRootBlock(schema, rootElement) &&
              rootElementSchema.ui_element !== ScanConfigUIElementDict.BlockUnion) {
            if (isExpanded) {
              // Close: remove from expanded set
              setExpandedRootElements((prev) => {
                const newSet = new Set(prev);
                newSet.delete(rootElement);
                return newSet;
              });
              // If this was the selected block, clear selection
              if (selectedRootElement === rootElement) {
                setEditing(false);
                setSelectedEntry('');
                setSelectedRootElement('');
              }
              return;
            }
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
          shouldFlash
            ? flashType === 'add'
              ? styles.rootFlashAdded
              : flashType === 'remove'
              ? styles.rootFlashRemoved
              : styles.rootFlashModified
            : hasHighlights
            ? rootHighlightTypes.size > 1 || rootHighlightTypes.has('replace')
              ? styles.rootHighlightModified
              : rootHighlightTypes.has('add')
              ? styles.rootHighlightAdded
              : styles.rootHighlightRemoved
            : undefined
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
        isExpanded &&
        config[rootElement] && (
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
        />
      )}
    </>
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
