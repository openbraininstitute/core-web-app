// src/features/contribute/morphology/_components/hooks/schema.ts
import React from 'react';
import { atom, PrimitiveAtom } from 'jotai';
import { NotificationInstance } from 'antd/es/notification/interface';
import $RefParser from '@apidevtools/json-schema-ref-parser';

import { AtomsMap, JSONMorphologySchema } from '../../types';
import { ConfigValue, Config } from '../components';
import { isPlainObject, isAtom } from '../utils';
import { assertErrorMessage } from '@/util/utils';

// Define a type for the OpenAPI schema to include components
interface OpenAPISchema {
  components?: {
    schemas?: {
      SimulationsForm?: JSONMorphologySchema;
      ContributeMorphologyForm?: JSONMorphologySchema;
    };
  };
}

export function useObioneJsonMorphologySchema(
  notification: NotificationInstance,
  setSchema: React.Dispatch<React.SetStateAction<JSONMorphologySchema | null>>,
  setAtomsMap: (atomsMap: AtomsMap) => void,
  initialConfig?: Config
) {
  React.useEffect(() => {
    async function fetchSpec() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_OBI_ONE_URL}/openapi.json`);
        const json = await res.json();
        const dereferenced = (await $RefParser.dereference(json)) as OpenAPISchema;
        const theSchema = dereferenced.components?.schemas?.SimulationsForm as
          | JSONMorphologySchema
          | undefined;

        if (!theSchema || !theSchema.properties) {
          console.warn('useObioneJsonMorphologySchema: Schema has no properties', theSchema);
          notification.error({ message: 'Schema has no properties' });
          return;
        }

        console.log(
          'useObioneJsonMorphologySchema: Loaded schema',
          JSON.stringify(theSchema, null, 2)
        );
        console.log(
          'useObioneJsonMorphologySchema: schema.properties.morphology',
          theSchema.properties.morphology
        );

        setSchema(theSchema);

        const map: AtomsMap = {};

        if (initialConfig) {
          Object.entries(initialConfig)
            .filter(([k]) => isRootCategory(theSchema, k))
            .forEach(([k, v]) => {
              if (isPlainObject(v)) {
                const initial: Record<string, ConfigValue> = {};
                Object.entries(v).forEach(([subKey, subValue]) => {
                  initial[subKey] = subValue as ConfigValue;
                });
                map[k] = atom<Record<string, ConfigValue>>(initial);
              }
            });

          Object.entries(initialConfig)
            .filter(([k]) => !isRootCategory(theSchema, k))
            .forEach(([k, v]) => {
              if (!isPlainObject(v)) return;
              map[k] = {};
              Object.entries(v).forEach(([subK, subV]) => {
                if (!isPlainObject(subV) || isAtom(map[k])) return;
                const initial: Record<string, ConfigValue> = {};
                Object.entries(subV).forEach(([innerKey, innerValue]) => {
                  initial[innerKey] = innerValue as ConfigValue;
                });
                (map[k] as Record<string, PrimitiveAtom<Record<string, ConfigValue>>>)[subK] =
                  atom<Record<string, ConfigValue>>(initial);
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

        console.log('useObioneJsonMorphologySchema: Initialized atomsMap', map);
        setAtomsMap(map);
      } catch (e) {
        console.error(
          'useObioneJsonMorphologySchema: Failed to fetch schema:',
          assertErrorMessage(e)
        );
        notification.error({ message: assertErrorMessage(e) });
      }
    }

    fetchSpec();
  }, [notification, setAtomsMap, setSchema, initialConfig]);
}

export function isRootCategory(schema: JSONMorphologySchema | null, key: string) {
  const isRoot = schema?.properties?.[key] && !schema.properties[key].additionalProperties;
  console.log(`isRootCategory: key=${key}, isRoot=${isRoot}`);
  return isRoot;
}

export function resolveKey(
  schema: JSONMorphologySchema | null,
  tabKey: string,
  itemIdx: number | null
) {
  if (itemIdx === null) throw new Error('Invalid itemIdx');
  if (!schema || !schema.properties || !schema.properties[tabKey]?.singular_name) {
    console.warn(`resolveKey: Using fallback key for ${tabKey}_${itemIdx} due to missing schema`);
    return `${tabKey}_${itemIdx}`;
  }
  if (isRootCategory(schema, tabKey)) {
    console.log(`resolveKey: ${tabKey} is a root category, returning ${tabKey}`);
    return tabKey;
  }

  const key = `${schema.properties[tabKey].singular_name.replaceAll(' ', '')}_${itemIdx}`;
  console.log(`resolveKey: Generated key ${key} for tabKey=${tabKey}, itemIdx=${itemIdx}`);
  return key;
}

export function useObioneJsonConfigurationSchema(
  notification: NotificationInstance,
  setSchema: React.Dispatch<React.SetStateAction<JSONMorphologySchema | null>>,
  setAtomsMap: (atomsMap: AtomsMap) => void
) {
  React.useEffect(() => {
    async function fetchSpec() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_OBI_ONE_URL}/openapi.json`);
        const json = await res.json();
        const dereferenced = (await $RefParser.dereference(json)) as OpenAPISchema;
        const theSchema = dereferenced.components?.schemas?.ContributeMorphologyForm as
          | JSONMorphologySchema
          | undefined;

        if (!theSchema || !theSchema.properties) {
          console.warn('useObioneJsonConfigurationSchema: Schema has no properties', theSchema);
          notification.error({ message: 'Schema has no properties' });
          return;
        }

        console.log(
          'useObioneJsonConfigurationSchema: Loaded schema',
          JSON.stringify(theSchema, null, 2)
        );
        console.log(
          'useObioneJsonConfigurationSchema: schema.properties.morphology',
          theSchema.properties.morphology
        );

        setSchema(theSchema);

        const map: AtomsMap = {};
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

        console.log('useObioneJsonConfigurationSchema: Initialized atomsMap', map);
        setAtomsMap(map);
      } catch (e) {
        console.error(
          'useObioneJsonConfigurationSchema: Failed to fetch schema:',
          assertErrorMessage(e)
        );
        notification.error({ message: assertErrorMessage(e) });
      }
    }

    fetchSpec();
  }, [notification, setAtomsMap, setSchema]);
}
