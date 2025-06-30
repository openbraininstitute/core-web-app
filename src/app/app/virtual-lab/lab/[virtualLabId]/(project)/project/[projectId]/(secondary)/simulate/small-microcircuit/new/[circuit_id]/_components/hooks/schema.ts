import React from 'react';
import { atom } from 'jotai';
import { NotificationInstance } from 'antd/es/notification/interface';

import $RefParser from '@apidevtools/json-schema-ref-parser';

import { AtomsMap, JSONSchema } from '../../types';
import { ConfigValue } from '../components';
import { assertErrorMessage } from '@/util/utils';

export function useObioneJsonSchema(
  circuitId: string,
  notification: NotificationInstance,
  setSchema: React.Dispatch<React.SetStateAction<JSONSchema | null>>,
  setAtomsMap: (atomsMap: AtomsMap) => void
) {
  React.useEffect(() => {
    async function fetchSpec() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_OBI_ONE_URL}/openapi.json`);
        const json = await res.json();
        const dereferenced = await $RefParser.dereference(json);
        // @ts-ignore
        const theSchema = dereferenced.components.schemas.SimulationsForm as JSONSchema;
        if (!theSchema.properties) return;

        setSchema(theSchema);

        const map: {
          [key: string]:
            | ReturnType<typeof atom<Record<string, ConfigValue>>>
            | Record<string, ReturnType<typeof atom<Record<string, ConfigValue>>>>;
        } = {};

        // Setting up initial values and constants.
        Object.entries(theSchema.properties).forEach(([k, v]) => {
          if (!v.additionalProperties) {
            const initial: Record<string, ConfigValue> = {};

            if (v.properties)
              Object.entries(v.properties).forEach(([subkey, subValue]) => {
                if (subkey === 'type') initial[subkey] = subValue.const ?? null;
                else initial[subkey] = subValue.default ?? null;
              });

            if (k === 'initialize') {
              initial.circuit = {
                type: 'CircuitFromID',
                id_str: circuitId,
              };
            }

            map[k] = atom<Record<string, ConfigValue>>(initial);
          } else map[k] = {};
        });

        setAtomsMap(map);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(assertErrorMessage(e));
        notification.error({ message: assertErrorMessage(e) });
      }
    }

    fetchSpec();
  }, [circuitId, notification, setAtomsMap, setSchema]);
}

export function useSchemaUtils(schema: JSONSchema | null, configTab: string) {
  return React.useMemo(() => {
    function isRootCategory(key: string) {
      return schema?.properties?.[key] && !schema.properties[key].additionalProperties;
    }

    function resolveKey(tabKey: string, itemIdx: number | null) {
      if (typeof itemIdx === null) throw new Error('Invalid itemIdx');
      if (!schema?.properties?.[configTab]?.singular_name)
        throw new Error(`Invalid schema for ${configTab}`);
      if (isRootCategory(tabKey)) throw new Error("Shouldn't be a root category");

      return `${schema.properties[configTab].singular_name.replaceAll(' ', '')}_${itemIdx}`;
    }

    return { isRootCategory, resolveKey };
  }, [configTab, schema]);
}
