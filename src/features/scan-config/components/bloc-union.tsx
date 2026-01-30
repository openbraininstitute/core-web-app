import { atom } from 'jotai';
import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import {
  BlockUI,
  type Config,
  type ConfigValue,
} from '@/features/scan-config/components/components';
import { isAtom } from '@/features/scan-config/components/utils';
import type {
  AtomsMap,
  Block,
  BlockUnion as BlockUnionT,
  ConfigSchema,
  SchemaName,
} from '@/features/scan-config/types';

type Props = {
  schemaName: SchemaName;
  schema: ConfigSchema;
  blockUnionSchema: BlockUnionT;
  selectedRootElement: string;
  atomsMap: AtomsMap;
  setAtomsMap: (v: AtomsMap) => void;
  selectedEntry: string;
  setSelectedEntry: (entry: string) => void;
  campaignId: string;
  loading: boolean;
  config: Config;
  selectedBlockSchema?: Block;
  model: ICircuit | IMEModel;
  allEntries: Set<string>;
  onNewBlockClick?: () => void;
};

export default function BlockUnion({
  schemaName,
  blockUnionSchema,
  selectedRootElement,
  atomsMap,
  setAtomsMap,
  selectedEntry,
  campaignId,
  loading,
  config,
  model,
}: Props) {
  const selectedBlock =
    typeof config[selectedRootElement] !== 'string' ? config[selectedRootElement]?.type : undefined;

  const selectedBlockSchema: Block | undefined = blockUnionSchema.oneOf.find(
    (o: Block) => o.properties?.type.const === selectedBlock
  );

  if (selectedBlockSchema && isAtom(atomsMap[selectedRootElement]))
    return (
      <BlockUI
        schemaName={schemaName}
        key={`${selectedRootElement}_${selectedEntry}`}
        disabled={!!campaignId || loading}
        config={config}
        blockSchema={selectedBlockSchema}
        stateAtom={atomsMap[selectedRootElement]}
        model={model}
        showBackButton
      />
    );

  return (
    <div className="flex flex-col items-center gap-5">
      {blockUnionSchema.oneOf.map((o) => {
        return (
          <button
            key={o.title}
            type="button"
            className="min-h-[100px] w-full cursor-pointer rounded-xl border border-gray-200 p-5 text-left hover:bg-white"
            onClick={() => {
              const initial: Record<string, ConfigValue> = {};
              if (o.properties)
                Object.entries(o.properties).forEach(([subkey, subValue]) => {
                  initial[subkey] = subValue.default ?? null;
                });

              setAtomsMap({
                ...atomsMap,
                [selectedRootElement]: atom(initial),
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
