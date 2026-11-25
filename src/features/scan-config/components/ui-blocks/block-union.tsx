import { CloseOutlined } from '@ant-design/icons';

import {
  type TSchemaMappingConfiguration,
  unionVariantDefaults,
} from '@/features/scan-config/components/hooks/schema';
import { renderMathInText } from '@/features/scan-config/components/shared/render-math-in-text';
import Block from '@/features/scan-config/components/ui-blocks/block';
import { useShowingDiffs } from '@/features/scan-config/hooks/use-showing-diffs';
import { writeBlock } from '@/features/scan-config/store';
import { isType } from '@/features/scan-config/types';
import {
  BlockScopeProvider,
  useBlockProperty,
  useHasBlock,
  useSetConfig,
} from '@/features/scan-config/use-config-store';

import type {
  ConfigSchema,
  ConfigValue,
  IRootBlockUnion,
  TBlock,
  TSupportedEntitiesForScanConfiguration,
  TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import type { Nullish } from '@/utils/type';

type Props = {
  schema: ConfigSchema;
  blockUnionSchema: IRootBlockUnion;
  selectedRootElement: string;
  campaignId: string;
  loading: boolean;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  entityType: TSupportedEntityTypesForScanConfiguration;
  errorPathPrefix?: string;
};

function getDiscriminatorProperty(schema: IRootBlockUnion): string {
  if (!schema.discriminator) return 'type';
  if (typeof schema.discriminator === 'string') return schema.discriminator;
  return schema.discriminator.propertyName ?? 'type';
}

export default function BlockUnion({
  schema,
  blockUnionSchema,
  selectedRootElement,
  campaignId,
  loading,
  entity,
  schemaMappingConfig,
  errorPathPrefix,
}: Props) {
  const discriminatorProp = getDiscriminatorProperty(blockUnionSchema);
  const showingDiffs = useShowingDiffs();

  // Get current selected type from config
  const setConfig = useSetConfig();
  const setCurrentConfig = (next: ConfigValue) =>
    setConfig((config) => writeBlock(config, selectedRootElement, undefined, next));
  const hasBlock = useHasBlock(selectedRootElement);
  const discriminator = useBlockProperty(selectedRootElement, undefined, discriminatorProp);
  const selectedType = typeof discriminator === 'string' ? discriminator : undefined;

  // Find the matching variant schema based on the current type
  const selectedBlockSchema: TBlock | undefined = blockUnionSchema.oneOf.find((o: TBlock) => {
    const typeProp = o.properties?.[discriminatorProp];
    return typeProp && isType(typeProp) && typeProp.const === selectedType;
  });

  // If a variant is selected and we have an atom, show the form
  if (selectedBlockSchema && hasBlock) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-lg text-gray-500">{renderMathInText(selectedBlockSchema.title)}</div>
          {!campaignId && !loading && (
            <button
              type="button"
              aria-label="Reset block selection"
              className="cursor-pointer text-neutral-3 transition-colors hover:text-primary-8 px-2 py-1 hover:bg-neutral-3/20 rounded-full"
              onClick={() => setCurrentConfig({})}
            >
              <CloseOutlined />
            </button>
          )}
        </div>
        <BlockScopeProvider rootElement={selectedRootElement}>
          <Block
            hideTitle
            schema={schema}
            key={`${selectedRootElement}_${selectedType}`}
            disabled={!!campaignId || loading || showingDiffs}
            blockSchema={selectedBlockSchema}
            entity={entity}
            schemaMappingConfig={schemaMappingConfig}
            errorPathPrefix={errorPathPrefix}
          />
        </BlockScopeProvider>
      </div>
    );
  }

  // Hide variant picker during diff mode
  if (showingDiffs) {
    return null;
  }

  return (
    <div
      className="flex flex-col items-center gap-5"
      data-scan-config-block={blockUnionSchema.ui_element}
    >
      {blockUnionSchema.oneOf.map((o) => {
        const typeProp = o.properties?.[discriminatorProp];
        const variantId = typeProp && isType(typeProp) ? typeProp.const : undefined;
        return (
          <button
            data-scan-config-block-element-item={`${blockUnionSchema.ui_element}_item`}
            data-testid={`scan-config-variant-${variantId ?? o.title}`}
            key={o.title}
            type="button"
            className="min-h-25 w-full cursor-pointer rounded-xl border border-gray-200 p-5 text-left hover:bg-white"
            onClick={() => setCurrentConfig(unionVariantDefaults(o))}
          >
            <span className="text-primary-9 block text-lg font-bold">
              {renderMathInText(o.title)}
            </span>
            <span className="mt-3 block">{o.description}</span>
          </button>
        );
      })}
    </div>
  );
}
