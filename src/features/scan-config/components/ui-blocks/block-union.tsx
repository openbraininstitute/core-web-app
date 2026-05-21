import { CloseOutlined } from '@ant-design/icons';

import Block from '@/features/scan-config/components/ui-blocks/block';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { useShowingDiffs } from '@/features/scan-config/hooks/use-showing-diffs';
import { isType } from '@/features/scan-config/types';

import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type {
  Config,
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
  config: Config;
  setConfig: (newConfig: Config) => void;
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
  config,
  setConfig,
  entity,
  schemaMappingConfig,
  errorPathPrefix,
}: Props) {
  const discriminatorProp = getDiscriminatorProperty(blockUnionSchema);
  const showingDiffs = useShowingDiffs();

  // Get current selected type from config
  const currentConfig = config[selectedRootElement];
  const selectedType =
    isPlainObject(currentConfig) && typeof currentConfig[discriminatorProp] === 'string'
      ? currentConfig[discriminatorProp]
      : undefined;

  // Find the matching variant schema based on the current type
  const selectedBlockSchema: TBlock | undefined = blockUnionSchema.oneOf.find((o: TBlock) => {
    const typeProp = o.properties?.[discriminatorProp];
    return typeProp && isType(typeProp) && typeProp.const === selectedType;
  });

  // If a variant is selected and we have an atom, show the form
  if (selectedBlockSchema && isPlainObject(config[selectedRootElement])) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-lg text-gray-500 uppercase">{selectedBlockSchema.title}</div>
          {!campaignId && !loading && (
            <button
              type="button"
              aria-label="Reset block selection"
              className="cursor-pointer text-neutral-3 transition-colors hover:text-primary-8 px-2 py-1 hover:bg-neutral-3/20 rounded-full"
              onClick={() => {
                setConfig({
                  ...config,
                  [selectedRootElement]: {},
                });
              }}
            >
              <CloseOutlined />
            </button>
          )}
        </div>
        <Block
          hideTitle
          schema={schema}
          key={`${selectedRootElement}_${selectedType}`}
          disabled={!!campaignId || loading || showingDiffs}
          config={config}
          blockSchema={selectedBlockSchema}
          state={config[selectedRootElement]}
          setState={(newConfig) => {
            setConfig({ ...config, [selectedRootElement]: newConfig });
          }}
          entity={entity}
          schemaMappingConfig={schemaMappingConfig}
          errorPathPrefix={errorPathPrefix}
        />
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
        return (
          <button
            data-scan-config-block-element-item={`${blockUnionSchema.ui_element}_item`}
            key={o.title}
            type="button"
            className="min-h-25 w-full cursor-pointer rounded-xl border border-gray-200 p-5 text-left hover:bg-white"
            onClick={() => {
              const initial: Record<string, ConfigValue> = {};
              if (o.properties) {
                Object.entries(o.properties).forEach(([subkey, subValue]) => {
                  if (isType(subValue)) {
                    initial[subkey] = subValue.const ?? subValue.default ?? null;
                  } else {
                    initial[subkey] = subValue.default ?? null;
                  }
                });
              }

              setConfig({
                ...config,
                [selectedRootElement]: initial,
              });
            }}
          >
            <span className="text-primary-9 block text-lg font-bold">{o.title}</span>
            <span className="mt-3 block">{o.description}</span>
          </button>
        );
      })}
    </div>
  );
}
