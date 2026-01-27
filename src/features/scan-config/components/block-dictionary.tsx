import { atom } from 'jotai';
import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import {
  BlockUI,
  type Config,
  type ConfigValue,
} from '@/features/scan-config/components/components';
import { isRootBlock } from '@/features/scan-config/components/hooks/schema';
import { isAtom, isPlainObject } from '@/features/scan-config/components/utils';
import type {
  AtomsMap,
  IBlockDictionary as BlockDictionaryT,
  ConfigSchema,
  SchemaName,
  TBlock,
} from '@/features/scan-config/types';

type Props = {
  schemaName: SchemaName;
  schema: ConfigSchema;
  blockDictionarySchema: BlockDictionaryT;
  selectedRootElement: string;
  atomsMap: AtomsMap;
  setAtomsMap: (v: AtomsMap) => void;
  selectedEntry: string;
  setSelectedEntry: (entry: string) => void;
  campaignId: string;
  loading: boolean;
  config: Config;
  selectedBlockSchema?: TBlock;
  model: ICircuit | IMEModel;
  allEntries: Set<string>;
  onNewBlockClick?: () => void;
};

export default function BlockDictionary({
  schemaName,
  schema,
  blockDictionarySchema,
  selectedRootElement,
  atomsMap,
  setAtomsMap,
  selectedEntry,
  setSelectedEntry,
  campaignId,
  loading,
  config,
  model,
  allEntries,
  onNewBlockClick,
}: Props) {
  const selectedBlock = isPlainObject(config[selectedRootElement])
    ? config[selectedRootElement][selectedEntry]?.type
    : undefined;

  const selectedBlockSchema: TBlock | undefined =
    blockDictionarySchema.additionalProperties.oneOf.find(
      (o: TBlock) => o.properties?.type.const === selectedBlock
    );

  if (selectedBlockSchema && !isAtom(atomsMap[selectedRootElement]))
    return (
      <BlockUI
        schemaName={schemaName}
        key={`${selectedRootElement}_${selectedEntry}`}
        disabled={!!campaignId || loading}
        config={config}
        blockSchema={selectedBlockSchema}
        stateAtom={atomsMap[selectedRootElement]?.[selectedEntry]}
        model={model}
      />
    );

  return (
    <div className="flex flex-col items-center gap-5">
      {blockDictionarySchema.additionalProperties.oneOf.map((o) => {
        return (
          <button
            key={o.title}
            type="button"
            className="min-h-[100px] w-full cursor-pointer rounded-xl border border-gray-200 p-5 text-left hover:bg-white"
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
                element.ui_element === 'block_dictionary' ? element.singular_name : 'element';
              let counter = 0;
              let newEntry: string;

              do {
                newEntry = `${baseName} ${counter++}`;
              } while (allEntries.has(newEntry));

              setSelectedEntry(newEntry);
              allEntries.add(newEntry);

              setAtomsMap({
                ...atomsMap,
                [selectedRootElement]: {
                  ...atomsMap[selectedRootElement],
                  [newEntry]: atom<Record<string, ConfigValue>>(initial),
                },
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
