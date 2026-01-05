import { atom } from 'jotai';

import { Config, ConfigValue, JSONSchemaForm } from '@/features/scan-config/_components/components';
import { AtomsMap, ConfigSchema, Block } from '@/features/scan-config/types';
import { isRootCategory } from '@/features/scan-config/_components/hooks/schema';
import { isAtom } from '@/features/scan-config/_components/utils';
import { classNames } from '@/util/utils';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { IMEModel } from '@/api/entitycore/types';
import styles from '@/features/scan-config/scan-config.module.css';

type MiddleProps = {
  schema: ConfigSchema;
  configTab: string;
  selectedCategory: string;
  editing: boolean;
  atomsMap: AtomsMap;
  setAtomsMap: (v: AtomsMap) => void;
  setSelectedCategory: (s: string) => void;
  selectedEntry: string;
  setSelectedEntry: (entry: string) => void;
  handleAddReferenceClick: (ref: string) => void;
  campaignId: string;
  loading: boolean;
  config: Config;
  selectedBlockSchema?: Block;
  model: ICircuit | IMEModel;
  virtualLabId: string;
  projectId: string;
  allEntries: Set<string>;
  onNewBlockClick?: () => void;
};

export default function Middle({
  schema,
  configTab,
  selectedCategory,
  editing,
  atomsMap,
  setAtomsMap,
  setSelectedCategory,
  selectedEntry,
  setSelectedEntry,
  handleAddReferenceClick,
  campaignId,
  loading,
  config,
  selectedBlockSchema,
  model,
  virtualLabId,
  projectId,
  allEntries,
  onNewBlockClick,
}: MiddleProps) {
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
                    if (isRootCategory(schema, configTab)) return;

                    if (onNewBlockClick) onNewBlockClick();

                    setSelectedCategory(o.properties?.type.const ?? '');
                    const initial: Record<string, ConfigValue> = {};
                    if (o.properties)
                      Object.entries(o.properties).forEach(([subkey, subValue]) => {
                        if (subkey === 'type') initial[subkey] = subValue.const ?? null;
                        else initial[subkey] = subValue.default ?? null;
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

      {schema.properties &&
        schema.properties?.[configTab] &&
        editing &&
        (isRootCategory(schema, configTab) || selectedBlockSchema) && (
          <JSONSchemaForm
            key={isRootCategory(schema, configTab) ? configTab : `${configTab}_${selectedEntry}`}
            selectedCategory={selectedCategory}
            onAddReferenceClick={handleAddReferenceClick}
            disabled={!!campaignId || loading}
            config={config}
            schema={
              schema.properties[configTab].ui_element === 'root_block'
                ? schema.properties[configTab]
                : selectedBlockSchema
            }
            stateAtom={
              isAtom(atomsMap[configTab])
                ? atomsMap[configTab]
                : atomsMap[configTab]?.[selectedEntry]
            }
            model={model}
            virtualLabId={virtualLabId}
            projectId={projectId}
          />
        )}
    </div>
  );
}
