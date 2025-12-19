import { atom } from 'jotai';
import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import {
  type Config,
  type ConfigValue,
  JSONSchemaForm,
} from '@/features/small-microcircuit/_components/components';
import { isRootCategory } from '@/features/small-microcircuit/_components/hooks/schema';
import { isAtom } from '@/features/small-microcircuit/_components/utils';
import styles from '@/features/small-microcircuit/small-microcircuit.module.css';
import type { AtomsMap, JSONSchema } from '@/features/small-microcircuit/types';
import { classNames } from '@/util/utils';

type MiddleProps = {
  schema: JSONSchema;
  configTab: string;
  selectedCategory: string;
  editing: boolean;
  atomsMap: AtomsMap;
  setAtomsMap: (v: AtomsMap) => void;
  setSelectedCategory: (s: string) => void;
  selectedEntry: string;
  setSelectedEntry: (entry: string) => void;
  referenceTypesToConfigKeys: Record<string, string>;
  referenceTypesToTitles: Record<string, string>;
  refLabels: Record<string, string>;
  handleAddReferenceClick: (ref: string) => void;
  campaignId: string;
  loading: boolean;
  config: Config;
  selectedCatSchema?: JSONSchema;
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
  referenceTypesToConfigKeys,
  referenceTypesToTitles,
  refLabels,
  handleAddReferenceClick,
  campaignId,
  loading,
  config,
  selectedCatSchema,
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
        'h-full overflow-y-auto border-r border-l border-gray-200 px-5',
      )}
    >
      {schema.properties?.[configTab]?.additionalProperties?.oneOf &&
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

                    const baseName = schema.properties?.[configTab]?.singular_name ?? 'element';
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
        (isRootCategory(schema, configTab) || selectedCatSchema) && (
          <JSONSchemaForm
            referenceTypesToConfigKeys={referenceTypesToConfigKeys}
            referenceTypesToTitles={referenceTypesToTitles}
            refLabels={refLabels}
            key={isRootCategory(schema, configTab) ? configTab : `${configTab}_${selectedEntry}`}
            selectedCategory={selectedCategory}
            onAddReferenceClick={handleAddReferenceClick}
            disabled={!!campaignId || loading}
            config={config}
            schema={selectedCatSchema ?? schema.properties[configTab]}
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
