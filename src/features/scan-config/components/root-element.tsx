import { CheckCircleFilled, WarningFilled } from '@ant-design/icons';
import { lowerCase, upperFirst } from 'es-toolkit/compat';
import { useSetAtom } from 'jotai';

import BlockDictionaryEntries from '@/features/scan-config/components/block-dictionary-entries';
import { Chevron, LeftMenuTab } from '@/features/scan-config/components/components';
import { useFieldErrorsForPath } from '@/features/scan-config/components/hooks/field-errors';
import { isRootBlock } from '@/features/scan-config/components/hooks/schema';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { useRootElementDiff } from '@/features/scan-config/hooks/use-root-element-diff';
import {
  type Config,
  type ConfigSchema,
  type IBlockDictionary,
  type IBlockSingle,
  type IRootBlockUnion,
  isType,
  ScanConfigUIElementDict,
  type TBlock,
} from '@/features/scan-config/types';
import { useAIConfig } from '@/services/ai-agent';
import { expandedRootElementsAtom } from '@/state/config-highlights';
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
}: {
  schema: ConfigSchema | null; // The global schema
  rootElement: string;
  rootElementSchema: IBlockSingle | IBlockDictionary | IRootBlockUnion;
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
}) {
  const { isChatReady } = useAIConfig();
  const setExpandedRootElements = useSetAtom(expandedRootElementsAtom);
  const { highlights, hasHighlights, isExpanded, diffClass } = useRootElementDiff(rootElement);
  const hasFieldErrors = useFieldErrorsForPath(rootElement);

  if (!schema || !schema?.properties) return;

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
              selectedTab={selectedRootElement}
              onClick={() => {
                const isDictionary =
                  !isRootBlock(schema, rootElement) &&
                  rootElementSchema.ui_element !== ScanConfigUIElementDict.BlockUnion;

                // BlockDictionary: always toggle expand/collapse on click,
                // regardless of whether this root element is currently selected.
                if (isDictionary) {
                  setSelectedRootElement(rootElement);
                  setSelectedEntry('');

                  if (isExpanded) {
                    setExpandedRootElements((prev) => {
                      const newSet = new Set(prev);
                      newSet.delete(rootElement);
                      return newSet;
                    });
                    setEditing(false);
                  } else {
                    setExpandedRootElements((prev) => {
                      const newSet = new Set(prev);
                      newSet.add(rootElement);
                      return newSet;
                    });
                    setEditing(false);
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
              <div className="flex gap-3">
                {errors?.find((error) => error.instancePath.startsWith(`/${rootElement}`)) ||
                hasFieldErrors ? (
                  <WarningFilled className="text-yellow-400!" />
                ) : (
                  <CheckCircleFilled className="text-green-600!" />
                )}

                <Chevron
                  rotate={
                    rootElementSchema.ui_element === ScanConfigUIElementDict.BlockDictionary
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
          className={cn(
            'text-white shadow-bnb max-w-2xs min-w-2xs rounded-md ',
            'bg-primary-8 px-4 py-2 text-base text-wrap ',
            'overflow-y-auto max-h-50 primary-scrollbar'
          )}
          arrowClassName="bg-primary-8"
        >
          {rootElementSchema.description}
        </TooltipContent>
      </Tooltip>

      {rootElementSchema.ui_element === ScanConfigUIElementDict.BlockDictionary &&
        (config[rootElement] || hasHighlights) && (
          <BlockDictionaryEntries
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
