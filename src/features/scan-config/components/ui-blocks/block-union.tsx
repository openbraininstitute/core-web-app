import { CloseOutlined } from '@ant-design/icons';
import { atom } from 'jotai';

import Block from '@/features/scan-config/components/block';
import { isAtom, isPlainObject } from '@/features/scan-config/components/utils';
import { isType } from '@/features/scan-config/types';
import { useAtomValue } from 'jotai';
import { configHighlightsAtom } from '@/state/config-highlights';

import type { Config, ConfigValue } from '@/features/scan-config/components/components';
import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type {
  AtomsMap,
  ConfigSchema,
  IRootBlockUnion,
  SchemaName,
  TBlock,
  TSupportedEntitiesForScanConfiguration,
  TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import type { Nullish } from '@/utils/type';

type Props = {
  schemaName: SchemaName;
  schema: ConfigSchema;
  blockUnionSchema: IRootBlockUnion;
  selectedRootElement: string;
  atomsMap: AtomsMap;
  setAtomsMap: (v: AtomsMap) => void;
  campaignId: string;
  loading: boolean;
  config: Config;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  entityType: TSupportedEntityTypesForScanConfiguration;
};

function getDiscriminatorProperty(schema: IRootBlockUnion): string {
  if (!schema.discriminator) return 'type';
  if (typeof schema.discriminator === 'string') return schema.discriminator;
  return schema.discriminator.propertyName ?? 'type';
}

export default function BlockUnion({
  schemaName,
  schema,
  blockUnionSchema,
  selectedRootElement,
  atomsMap,
  setAtomsMap,
  campaignId,
  loading,
  config,
  entity,
  schemaMappingConfig,
}: Props) {
  const discriminatorProp = getDiscriminatorProperty(blockUnionSchema);
  const highlights = useAtomValue(configHighlightsAtom);
  const showingDiffs = highlights.length > 0;

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
  if (selectedBlockSchema && isAtom(atomsMap[selectedRootElement])) {
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
                setAtomsMap({
                  ...atomsMap,
                  [selectedRootElement]: atom<Record<string, ConfigValue>>({}),
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
          schemaName={schemaName}
          key={`${selectedRootElement}_${selectedType}`}
          disabled={!!campaignId || loading || showingDiffs}
          config={config}
          blockSchema={selectedBlockSchema}
          stateAtom={atomsMap[selectedRootElement]}
          entity={entity}
          schemaMappingConfig={schemaMappingConfig}
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

              setAtomsMap({
                ...atomsMap,
                [selectedRootElement]: atom<Record<string, ConfigValue>>(initial),
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
