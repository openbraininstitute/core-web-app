import { atom } from 'jotai';
import { Fragment } from 'react';

import {
  Config,
  ConfigValue,
  JSONSchemaForm,
} from '@/features/small-microcircuit/_components/components';
import { AtomsMap, JSONSchema } from '@/features/small-microcircuit/types';
import { isRootCategory, resolveKey } from '@/features/small-microcircuit/_components/hooks/schema';
import { isAtom } from '@/features/small-microcircuit/_components/utils';
import { classNames } from '@/util/utils';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { IMEModel } from '@/api/entitycore/types';
import styles from '@/features/small-microcircuit/small-microcircuit.module.css';

type MiddleProps = {
  schema: JSONSchema;
  configTab: string;
  selectedCategory: string;
  editing: boolean;
  atomsMap: AtomsMap;
  setAtomsMap: (v: AtomsMap) => void;
  setSelectedCategory: (s: string) => void;
  selectedItemIdx: number | null;
  setSelectedItemIdx: (n: number | null) => void;
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
};

export default function Middle({
  schema,
  configTab,
  selectedCategory,
  editing,
  atomsMap,
  setAtomsMap,
  setSelectedCategory,
  selectedItemIdx,
  setSelectedItemIdx,
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
}: MiddleProps) {
  return (
    <div
      className={classNames(
        styles.scrollable,
        'h-full overflow-y-auto border-r border-l border-gray-200 px-5'
      )}
    >
      {schema.properties &&
        schema.properties?.[configTab]?.additionalProperties?.oneOf &&
        !selectedCategory &&
        editing && (
          <div className="flex flex-col items-center gap-5">
            {schema.properties[configTab].additionalProperties.oneOf.map((o) => {
              return (
                <Fragment key={o.title}>
                  <button
                    type="button"
                    className="min-h-[100px] w-full cursor-pointer rounded-xl border border-gray-200 p-5 text-left hover:bg-white"
                    onClick={() => {
                      if (isRootCategory(schema, configTab)) return;

                      setSelectedCategory(o.properties?.type.const ?? '');
                      const initial: Record<string, ConfigValue> = {};
                      if (o.properties)
                        Object.entries(o.properties).forEach(([subkey, subValue]) => {
                          if (subkey === 'type') initial[subkey] = subValue.const ?? null;
                          else initial[subkey] = subValue.default ?? null;
                        });
                      const itemIndexes = Object.keys(atomsMap[configTab] ?? {}).map((subkey) =>
                        parseInt(subkey.split('_')[1], 10)
                      );
                      itemIndexes.sort((a, b) => a - b);
                      const itemIdx = (itemIndexes.at(-1) ?? -1) + 1;
                      setSelectedItemIdx(itemIdx);
                      setAtomsMap({
                        ...atomsMap,
                        [configTab]: {
                          ...atomsMap[configTab],
                          [resolveKey(schema, configTab, itemIdx)]:
                            atom<Record<string, ConfigValue>>(initial),
                        },
                      });
                    }}
                  >
                    <span className="text-primary-9 block text-lg font-bold">{o.title}</span>
                    <span className="mt-3 block">{o.description}</span>
                  </button>
                </Fragment>
              );
            })}
          </div>
        )}

      {schema.properties &&
        schema.properties?.[configTab] &&
        editing &&
        (isRootCategory(schema, configTab) || selectedCatSchema) && (
          <JSONSchemaForm
            referenceTypesToConfigKeys={referenceTypesToConfigKeys}
            referenceTypesToTitles={referenceTypesToTitles}
            refLabels={refLabels}
            key={
              isRootCategory(schema, configTab)
                ? configTab
                : resolveKey(schema, configTab, selectedItemIdx)
            }
            selectedCategory={selectedCategory}
            onAddReferenceClick={handleAddReferenceClick}
            disabled={!!campaignId || loading}
            config={config}
            schema={selectedCatSchema ?? schema.properties[configTab]}
            stateAtom={
              isAtom(atomsMap[configTab])
                ? atomsMap[configTab]
                : atomsMap[configTab]?.[resolveKey(schema, configTab, selectedItemIdx)]
            }
            model={model}
            virtualLabId={virtualLabId}
            projectId={projectId}
          />
        )}
    </div>
  );
}
