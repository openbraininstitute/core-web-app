import { capitalize } from 'es-toolkit';
import { get } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';

import {
  getBlockUsabilityConfig,
  isRootBlock,
  type TSchemaMappingConfiguration,
} from '@/features/scan-config/components/hooks/schema';
import Block from '@/features/scan-config/components/ui-blocks/block';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { useDiffPreview } from '@/features/scan-config/hooks/use-diff-preview-atom';
import { useShowingDiffs } from '@/features/scan-config/hooks/use-showing-diffs';
import {
  type Config,
  type ConfigSchema,
  type ConfigValue,
  type IBlockDictionary,
  ScanConfigUIElementDict,
  type SchemaName,
  type TBlock,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { useAIConfig } from '@/services/ai-agent';
import { configDiffsAtom } from '@/state/config-highlights';
import { TextPatternTransformer, urlRegex } from '@/ui/molecules/text-pattern-transformer';
import { TransformedLink } from '@/ui/molecules/text-pattern-transformer/link-item';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { Nullish } from '@/utils/type';

type Props = {
  schemaName: SchemaName;
  schema: ConfigSchema;
  blockDictionarySchema: IBlockDictionary;
  selectedRootElement: string;
  selectedEntry: string;
  setSelectedEntry: (entry: string) => void;
  campaignId: string;
  loading: boolean;
  config: Config;
  setConfig: (newConfig: Config) => void;
  selectedBlockSchema?: TBlock;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  allEntries: Set<string>;
  onNewBlockClick?: () => void;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  errorPathPrefix?: string;
};

export default function BlockDictionary({
  schemaName,
  schema,
  blockDictionarySchema,
  selectedRootElement,
  selectedEntry,
  setSelectedEntry,
  campaignId,
  loading,
  config,
  setConfig,
  entity,
  allEntries,
  onNewBlockClick,
  schemaMappingConfig,
  errorPathPrefix,
}: Props) {
  const { aiConfig, isChatReady } = useAIConfig();
  const diffs = useAtomValue(configDiffsAtom);
  const showingDiffs = useShowingDiffs();
  const previewData = useDiffPreview(selectedRootElement, selectedEntry);

  const selectedBlockLocal =
    isPlainObject(config[selectedRootElement]) &&
    isPlainObject(config[selectedRootElement][selectedEntry])
      ? config[selectedRootElement][selectedEntry]?.type
      : undefined;

  const selectedBlockAI =
    aiConfig && isPlainObject(aiConfig[selectedRootElement])
      ? aiConfig[selectedRootElement][selectedEntry]?.type
      : undefined;

  const selectedBlock = selectedBlockLocal ?? selectedBlockAI;

  const selectedBlockSchema: TBlock | undefined =
    blockDictionarySchema.additionalProperties.oneOf.find(
      (o: TBlock) => o.properties?.type.const === selectedBlock
    );

  // Check if this entry was deleted
  const isDeleted = diffs.some(
    (d) =>
      d.type === 'remove' &&
      d.path.length === 2 &&
      d.path[0] === selectedRootElement &&
      d.path[1] === selectedEntry
  );

  if (
    selectedBlockSchema &&
    isPlainObject(config[selectedRootElement]) &&
    isPlainObject(config[selectedRootElement][selectedEntry])
  ) {
    const liveState = config[selectedRootElement]?.[selectedEntry];
    // Preview atom takes priority when showing diffs so the Block displays
    // the new/restored values instead of the current live values.
    const state = previewData ?? liveState ?? {};

    return (
      <Block
        schemaName={schemaName}
        schema={schema}
        key={`${selectedRootElement}_${selectedEntry}`}
        disabled={!!campaignId || loading || !!aiConfig || !isChatReady || showingDiffs}
        config={config}
        blockSchema={selectedBlockSchema}
        state={state}
        setState={(newState: Record<string, ConfigValue>) => {
          if (!isPlainObject(config[selectedRootElement])) return;
          setConfig({
            ...config,
            [selectedRootElement]: {
              ...config[selectedRootElement],
              [selectedEntry]: newState,
            },
          });
        }}
        entity={entity}
        schemaMappingConfig={schemaMappingConfig}
        rootElement={selectedRootElement}
        selectedEntry={selectedEntry}
        errorPathPrefix={errorPathPrefix}
      />
    );
  }

  // Show deleted message if entry was deleted
  if (isDeleted && selectedEntry) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-8">
        <div className="text-center max-w-md">
          <p className="text-gray-500 text-xl">
            <span className="font-semibold">{selectedEntry}</span> has been deleted
          </p>
        </div>
      </div>
    );
  }

  // Hide block type picker during diff mode
  if (showingDiffs) {
    return null;
  }

  return (
    <div
      className="flex flex-col items-center gap-5"
      data-scan-config-block={blockDictionarySchema.ui_element}
    >
      {blockDictionarySchema.additionalProperties.oneOf.map((o) => {
        const usability = getBlockUsabilityConfig({ block: o });
        let disable = false,
          message: string | undefined;

        if (
          usability.isDependent &&
          usability.property &&
          !get(schemaMappingConfig?.usability, usability.property)
        ) {
          disable = true;
          message = usability.error_message;
        }

        return (
          <Tooltip key={o.title}>
            <TooltipTrigger asChild>
              <button
                key={o.title}
                type="button"
                disabled={disable}
                className={cn(
                  'min-h-25 w-full cursor-pointer rounded-xl border border-gray-200 p-5 text-left hover:bg-white hover:shadow-xs',
                  { 'cursor-not-allowed opacity-50': disable }
                )}
                onClick={() => {
                  if (isRootBlock(schema, selectedRootElement)) return;
                  if (onNewBlockClick) onNewBlockClick();

                  const initial: Record<string, ConfigValue> = {};
                  if (o.properties)
                    Object.entries(o.properties).forEach(([subkey, subValue]) => {
                      initial[subkey] = subValue.default ?? null;
                    });

                  const element = schema.properties?.[selectedRootElement];

                  const baseName =
                    element.ui_element === ScanConfigUIElementDict.BlockDictionary
                      ? capitalize(element.singular_name)
                      : 'element';
                  let counter = 0;
                  let newEntry: string;

                  do {
                    newEntry = `${baseName} ${counter++}`;
                  } while (allEntries.has(newEntry));

                  setSelectedEntry(newEntry);
                  allEntries.add(newEntry);

                  if (!isPlainObject(config) || !isPlainObject(config[selectedRootElement])) return;

                  setConfig({
                    ...config,
                    [selectedRootElement]: {
                      ...config[selectedRootElement],
                      [newEntry]: initial,
                    },
                  });
                }}
                data-scan-config-block-element-item={`${blockDictionarySchema.ui_element}_item`}
              >
                <span className="text-primary-9 block text-lg font-bold">{o.title}</span>
                <span className="mt-3 block">
                  <TextPatternTransformer
                    regex={urlRegex}
                    component={(match) => (
                      <TransformedLink url={match} className="wrap-break-word text-primary-6" />
                    )}
                  >
                    {o.description}
                  </TextPatternTransformer>
                </span>
              </button>
            </TooltipTrigger>
            {disable && (
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
                {message}
              </TooltipContent>
            )}
          </Tooltip>
        );
      })}
    </div>
  );
}
