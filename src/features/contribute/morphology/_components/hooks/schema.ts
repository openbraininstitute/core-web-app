import React from 'react';
import { atom, PrimitiveAtom } from 'jotai';
import { NotificationInstance } from 'antd/es/notification/interface';
import $RefParser from '@apidevtools/json-schema-ref-parser';

import { AtomsMap, JSONMorphologySchema } from '../../types';
import { ConfigValue, Config } from '../components';
import { isPlainObject, isAtom } from '../utils';

// Define a type for the OpenAPI schema to include components
interface OpenAPISchema {
  components?: {
    schemas?: {
      [key: string]: JSONMorphologySchema;
    };
  };
}

/**
 * A generic hook to fetch and dereference a JSON schema from the OpenAPI spec.
 * It also initializes Jotai atoms based on the schema properties.
 *
 * @param notification Antd notification instance.
 * @param setSchema React state setter for the schema.
 * @param setAtomsMap React state setter for the atoms map.
 * @param schemaName The name of the schema to fetch (e.g., 'ContributeMorphologyForm').
 * @param initialConfig Optional initial configuration to populate the atoms.
 */
export function useObioneJsonSchema(
  notification: NotificationInstance,
  setSchema: React.Dispatch<React.SetStateAction<JSONMorphologySchema | null>>,
  setAtomsMap: (atomsMap: AtomsMap) => void,
  schemaName: string,
  initialConfig?: Config
) {
  React.useEffect(() => {
    async function fetchSpec() {
      try {
        //const res = await fetch(`${process.env.NEXT_PUBLIC_OBI_ONE_URL}/openapi.json`);
        const res = await fetch(`http://127.0.0.1:8100/openapi.json`);

        const json = await res.json();
        const dereferenced = (await $RefParser.dereference(json)) as OpenAPISchema;
        const theSchema = dereferenced.components?.schemas?.[schemaName];

        if (!theSchema || !theSchema.properties) {
          notification.error({ message: `Schema "${schemaName}" has no properties` });
          return;
        }

        setSchema(theSchema);

        const map: AtomsMap = {};

        if (initialConfig) {
          Object.entries(initialConfig)
            .filter(([k]) => isRootCategory(theSchema, k))
            .forEach(([k, v]) => {
              if (isPlainObject(v)) {
                map[k] = atom<Record<string, ConfigValue>>(v as Record<string, ConfigValue>);
              }
            });

          Object.entries(initialConfig)
            .filter(([k]) => !isRootCategory(theSchema, k))
            .forEach(([k, v]) => {
              if (!isPlainObject(v) || isAtom(map[k])) return;
              map[k] = {};
              Object.entries(v).forEach(([subK, subV]) => {
                if (!isPlainObject(subV)) return;
                (map[k] as Record<string, PrimitiveAtom<Record<string, ConfigValue>>>)[subK] = atom<
                  Record<string, ConfigValue>
                >(subV as Record<string, ConfigValue>);
              });
            });
        } else {
          Object.entries(theSchema.properties).forEach(([k, v]) => {
            if (!v.additionalProperties) {
              const initial: Record<string, ConfigValue> = {};
              if (v.properties) {
                Object.entries(v.properties).forEach(([subkey, subValue]) => {
                  initial[subkey] =
                    subkey === 'type'
                      ? (subValue.const ?? undefined)
                      : (subValue.default ?? undefined);
                });
              }
              map[k] = atom<Record<string, ConfigValue>>(initial);
            } else {
              map[k] = {};
            }
          });
        }
        setAtomsMap(map);
      } catch {
        notification.error({ message: `Failed to fetch schema "${schemaName}"` });
      }
    }
    fetchSpec();
  }, [notification, setAtomsMap, setSchema, schemaName, initialConfig]);
}

export function isRootCategory(schema: JSONMorphologySchema | null, key: string) {
  const isRoot = !!schema?.properties?.[key] && !schema.properties[key].additionalProperties;
  return isRoot;
}

export function resolveKey(
  schema: JSONMorphologySchema | null,
  tabKey: string,
  itemIdx: number | null
) {
  if (itemIdx === null) throw new Error('Invalid itemIdx');
  if (!schema || !schema.properties || !schema.properties[tabKey]?.singular_name) {
    return `${tabKey}_${itemIdx}`;
  }
  if (isRootCategory(schema, tabKey)) {
    return tabKey;
  }
  const key = `${schema.properties[tabKey].singular_name.replaceAll(' ', '')}_${itemIdx}`;
  return key;
}
