import $RefParser from '@apidevtools/json-schema-ref-parser';
import { NotificationInstance } from 'antd/es/notification/interface';
import { atom } from 'jotai';
import React, { useState } from 'react';
import { match } from 'ts-pattern';

import { EntityTypeDict, TEntityTypeDict } from '@/api/entitycore/types';

import { Config, ConfigValue } from '@/features/small-microcircuit/_components/components';
import { isAtom, isPlainObject } from '@/features/small-microcircuit/_components/utils';
import { AtomsMap, JSONSchema } from '@/features/small-microcircuit/types';

import { assertErrorMessage } from '@/util/utils';

export function useObioneJsonSchema(
  circuitId: string,
  modelEntityType: TEntityTypeDict,
  notification: NotificationInstance,
  setAtomsMap: (atomsMap: AtomsMap) => void,
  initialConfig?: Config
) {
  const [schema, setSchema] = useState<JSONSchema | null>(null);

  React.useEffect(() => {
    async function fetchSpec() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_OBI_ONE_URL}/openapi.json`);
        const json = await res.json();
        const dereferenced = await $RefParser.dereference(json);
        const schemaName = match(modelEntityType)
          .with(EntityTypeDict.Circuit, () => 'CircuitSimulationScanConfig')
          .with(EntityTypeDict.Memodel, () => 'MEModelSimulationScanConfig')
          .otherwise(() => {
            throw new Error(`Unsupported entity type: ${modelEntityType}`);
          });
        // @ts-ignore
        const theSchema = dereferenced.components.schemas[schemaName] as JSONSchema;
        if (!theSchema.properties) return;

        setSchema(theSchema);

        const map: {
          [key: string]:
            | ReturnType<typeof atom<Record<string, ConfigValue>>>
            | Record<string, ReturnType<typeof atom<Record<string, ConfigValue>>>>;
        } = {};

        if (initialConfig) {
          Object.entries(initialConfig)
            .filter(([k]) => {
              return isRootCategory(theSchema, k);
            })
            .forEach(([k, v]) => {
              if (isPlainObject(v)) map[k] = atom<Record<string, ConfigValue>>(v);
            });

          Object.entries(initialConfig)
            .filter(([k]) => {
              return !isRootCategory(theSchema, k);
            })
            .forEach(([k, v]) => {
              map[k] = {};

              Object.entries(v).forEach(([subK, subV]) => {
                if (!isPlainObject(subV) || isAtom(map[k])) return;
                map[k][subK] = atom<Record<string, ConfigValue>>(subV);
              });
            });
        } else {
          // Setting up initial values and constants.
          Object.entries(theSchema.properties).forEach(([k, v]) => {
            if (!v.additionalProperties) {
              const initial: Record<string, ConfigValue> = {};

              if (v.properties)
                Object.entries(v.properties).forEach(([subkey, subValue]) => {
                  if (subkey === 'type') initial[subkey] = subValue.const ?? null;
                  else initial[subkey] = subValue.default ?? null;
                });

              const formCircuitType = match(modelEntityType)
                .with(EntityTypeDict.Circuit, () => 'CircuitFromID')
                .with(EntityTypeDict.Memodel, () => 'MEModelFromID')
                .otherwise(() => {
                  throw new Error(`Unsupported entity type: ${modelEntityType}`);
                });

              if (k === 'initialize') {
                initial.circuit = {
                  type: formCircuitType,
                  id_str: circuitId,
                };
              }

              map[k] = atom<Record<string, ConfigValue>>(initial);
            } else map[k] = {};
          });
        }

        setAtomsMap(map);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(assertErrorMessage(e));
        notification.error({ message: assertErrorMessage(e) });
      }
    }

    fetchSpec();
  }, [circuitId, modelEntityType, notification, setAtomsMap, setSchema, initialConfig]);

  const referenceTypesToConfigKeys: Record<string, string> = {};
  const referenceTypesToTitles: Record<string, string> = {};

  if (schema?.properties) {
    Object.entries(schema?.properties).forEach(([k, v]) => {
      if (v.reference_type) {
        referenceTypesToConfigKeys[v.reference_type] = k;
        referenceTypesToTitles[v.reference_type] = v.singular_name ?? '';
      }
    });
  }

  return {
    schema,
    refLabels: schema?.default_block_reference_labels,
    referenceTypesToConfigKeys,
    referenceTypesToTitles,
  };
}

export function isRootCategory(schema: JSONSchema, key: string) {
  return schema.properties?.[key] && !schema.properties[key].additionalProperties;
}

export function resolveKey(schema: JSONSchema, tabKey: string, itemIdx: number | null) {
  if (typeof itemIdx === null) throw new Error('Invalid itemIdx');
  if (!schema.properties?.[tabKey]?.singular_name) throw new Error(`Invalid schema for ${tabKey}`);
  if (isRootCategory(schema, tabKey)) throw new Error("Shouldn't be a root category");

  return `${schema.properties[tabKey].singular_name.replaceAll(' ', '')}_${itemIdx}`;
}
