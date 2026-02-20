import { atom } from 'jotai';

import { isRootBlock } from '@/features/scan-config/components/hooks/schema';
import { type ConfigObject, isAtom, isPlainObject } from '@/features/scan-config/components/utils';
import {
  type AtomsMap,
  type ConfigSchema,
  type IBlockDictionary,
  ScanConfigUIElementDict,
  type SchemaName,
  type TBlock,
} from '@/features/scan-config/types';
import { useAIConfig } from '@/services/ai-agent';

import Block from './block';

import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEMCellMesh } from '@/api/entitycore/types/entities/em-cell-mesh';
import type { Config, ConfigValue } from '@/features/scan-config/components/components';

type Props = {
  schemaName: SchemaName;
  schema: ConfigSchema;
  blockDictionarySchema: IBlockDictionary;
  selectedRootElement: string;
  atomsMap: AtomsMap;
  setAtomsMap: (v: AtomsMap) => void;
  selectedEntry: string;
  setSelectedEntry: (entry: string) => void;
  campaignId: string;
  loading: boolean;
  config: Config;
  selectedBlockSchema?: TBlock;
  model: ICircuit | IMEModel | IEMCellMesh;
  allEntries: Set<string>;
  onNewBlockClick?: () => void;
  blockAIConfig: ConfigObject | null;
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
  blockAIConfig,
}: Props) {
  const { aiConfig, isChatReady } = useAIConfig();

  const selectedBlockLocal = isPlainObject(config[selectedRootElement])
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

  if (selectedBlockSchema && !isAtom(atomsMap[selectedRootElement])) {
    return (
      <Block
        schemaName={schemaName}
        key={`${selectedRootElement}_${selectedEntry}`}
        disabled={!!campaignId || loading || !!blockAIConfig || !isChatReady}
        config={config}
        blockSchema={selectedBlockSchema}
        stateAtom={atomsMap[selectedRootElement]?.[selectedEntry]}
        model={model}
        blockAIConfig={blockAIConfig}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {blockDictionarySchema.additionalProperties.oneOf.map((o) => {
        return (
          <button
            key={o.title}
            type="button"
            className="min-h-25 w-full cursor-pointer rounded-xl border border-gray-200 p-5 text-left hover:bg-white"
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
                  ? element.singular_name
                  : 'element';
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
