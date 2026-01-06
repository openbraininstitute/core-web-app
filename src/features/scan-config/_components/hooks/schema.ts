import $RefParser from '@apidevtools/json-schema-ref-parser';

import { atom } from 'jotai';

import { match } from 'ts-pattern';
import { useSchemaName } from '.';

import { EntityTypeDict, IMEModel } from '@/api/entitycore/types';
import { CircuitScaleDictionary, ICircuit } from '@/api/entitycore/types/entities/circuit';

import { config } from '@/config';

import { Config, ConfigValue } from '@/features/scan-config/_components/components';
import { isAtom, isPlainObject } from '@/features/scan-config/_components/utils';

import { AtomsMap, ConfigSchema, SchemaName, isType } from '@/features/scan-config/types';

import { useQuery } from '@tanstack/react-query';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { useEffect, useState } from 'react';

export function useObioneJsonSchema(model: ICircuit | IMEModel) {
  const schemaName = useSchemaName({ model });

  const { data: schema } = useQuery({
    queryKey: keyBuilder.obiOneJsonSchema(schemaName),
    queryFn: () => fetchSchema({ schemaName }),
    // Keep data fresh indefinitely to prevent atom regeneration on window focus
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return schema as ConfigSchema;
}

export function isRootCategory(schema: ConfigSchema, key: string) {
  return schema.properties?.[key] && schema.properties[key].ui_element === 'root_block';
}

async function fetchSchema({ schemaName }: { schemaName: SchemaName }) {
  const res = await fetch(`${config.OBI_ONE_URL}/openapi.json`);
  const json = await res.json();
  const dereferenced = await $RefParser.dereference(json);

  // @ts-ignore
  const theSchema = dereferenced.components.schemas[schemaName] as ConfigSchema;

  return theSchema;
}

export function useAtomsMap({
  schema,
  initialConfig,
  model,
}: {
  schema?: ConfigSchema;
  initialConfig?: Config;
  model: ICircuit | IMEModel;
}) {
  const [atomsMap, setAtomsMap] = useState<AtomsMap>({});

  useEffect(() => {
    if (!schema?.properties) return;

    const map: {
      [key: string]:
        | ReturnType<typeof atom<Record<string, ConfigValue>>>
        | Record<string, ReturnType<typeof atom<Record<string, ConfigValue>>>>;
    } = {};

    // Logic to build the atoms map based on initialConfig OR schema defaults
    if (initialConfig) {
      Object.entries(initialConfig)
        .filter(([k]) => isRootCategory(schema, k))
        .forEach(([k, v]) => {
          if (isPlainObject(v)) map[k] = atom<Record<string, ConfigValue>>(v);
        });

      Object.entries(initialConfig)
        .filter(([k]) => !isRootCategory(schema, k))
        .forEach(([k, v]) => {
          map[k] = {};
          Object.entries(v).forEach(([subK, subV]) => {
            if (!isPlainObject(subV) || isAtom(map[k])) return;
            map[k][subK] = atom<Record<string, ConfigValue>>(subV);
          });
        });
    } else {
      Object.entries(schema.properties).forEach(([k, v]) => {
        if (isType(v)) return;
        if (v.ui_element === 'root_block') {
          const initial: Record<string, ConfigValue> = {};

          Object.entries(v.properties).forEach(([subkey, subValue]) => {
            initial[subkey] = subValue.default ?? null;
          });

          const formModelType = match(model)
            .with({ type: EntityTypeDict.Memodel }, () => 'MEModelFromID')
            .with(
              { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Single },
              () => 'MEModelWithSynapsesCircuitFromID'
            )
            .with({ type: EntityTypeDict.Circuit }, () => 'CircuitFromID')
            .otherwise(() => {
              throw new Error(`Unsupported entity type: ${model.type}`);
            });

          if (k === 'initialize') {
            initial.circuit = {
              type: formModelType,
              id_str: model.id,
            };
          }

          map[k] = atom<Record<string, ConfigValue>>(initial);
        } else {
          map[k] = {};
        }
      });
    }

    setAtomsMap(map);
  }, [schema, model, initialConfig]);

  return [atomsMap, setAtomsMap] as const;
}
