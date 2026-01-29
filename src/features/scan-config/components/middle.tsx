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
import styles from '@/features/scan-config/scan-config.module.css';
import type { AtomsMap, Block, ConfigSchema, SchemaName } from '@/features/scan-config/types';
import { useAIConfig } from '@/services/ai-agent';
import { classNames } from '@/util/utils';

type MiddleProps = {
  schemaName: SchemaName;
  schema: ConfigSchema;
  configTab: string;
  selectedCategory: string;
  editing: boolean;
  atomsMap: AtomsMap;
  setAtomsMap: (v: AtomsMap) => void;
  setSelectedCategory: (s: string) => void;
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

export default function Middle({
  schemaName,
  schema,
  configTab,
  selectedCategory,
  editing,
  atomsMap,
  setAtomsMap,
  setSelectedCategory,
  selectedEntry,
  setSelectedEntry,
  campaignId,
  loading,
  config,
  selectedBlockSchema,
  model,
  allEntries,
  onNewBlockClick,
}: MiddleProps) {
  const { aiConfig, isChatReady } = useAIConfig();

  const getBlockAIConfig = () => {
    if (!aiConfig) return null;

    const blockConf = aiConfig[configTab];
    if (!isPlainObject(blockConf)) return {};
    if (isRootBlock(schema, configTab)) return blockConf;
    return blockConf[selectedEntry] ?? {};
  };

  return (
    <div
      className={classNames(
        styles.scrollable,
        'h-full overflow-y-auto border-r border-l border-gray-200 px-5'
      )}
    >
      {schema.properties?.[configTab]?.ui_element === 'block_dictionary' &&
        !selectedCategory &&
        editing && (
          <div className="flex flex-col items-center gap-5">
            {schema.properties[configTab].additionalProperties.oneOf.map((o) => {
              return (
                <button
                  key={o.title}
                  type="button"
                  className="min-h-[100px] w-full cursor-pointer rounded-xl border border-gray-200 p-5 text-left hover:bg-white"
                  onClick={() => {
                    if (isRootBlock(schema, configTab)) return;

                    if (onNewBlockClick) onNewBlockClick();

                    setSelectedCategory(o.properties?.type.const ?? '');
                    const initial: Record<string, ConfigValue> = {};
                    if (o.properties)
                      Object.entries(o.properties).forEach(([subkey, subValue]) => {
                        initial[subkey] = subValue.default ?? null;
                      });

                    const element = schema.properties?.[configTab];

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
                      [configTab]: {
                        ...atomsMap[configTab],
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
        )}

      {schema.properties?.[configTab] &&
        editing &&
        (isRootBlock(schema, configTab) || selectedBlockSchema) && (
          <BlockUI
            schemaName={schemaName}
            key={isRootBlock(schema, configTab) ? configTab : `${configTab}_${selectedEntry}`}
            disabled={!!campaignId || loading || !!aiConfig || !isChatReady}
            config={config}
            blockSchema={
              schema.properties[configTab].ui_element === 'root_block'
                ? schema.properties[configTab]
                : selectedBlockSchema
            }
            stateAtom={
              isAtom(atomsMap[configTab])
                ? atomsMap[configTab]
                : (atomsMap[configTab]?.[selectedEntry] ?? null)
            }
            model={model}
            blockAIConfig={getBlockAIConfig()}
          />
        )}
    </div>
  );
}
