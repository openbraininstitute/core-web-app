import React from 'react';
import { atom, useAtom } from 'jotai';

// Correctly importing types and Config from their respective files
import { JSONMorphologySchema, AtomsMap } from '../../types';
import { Config, ConfigValue } from '../components';
import { isAtom } from '../utils';

export function useConfigAtom(schema: JSONMorphologySchema | null, atomsMap: AtomsMap) {
  const configAtom = React.useMemo(() => {
    return atom((get) => {
      const result: Config = {};

      if (!schema || !schema.properties) {
        return result;
      }

      Object.keys(atomsMap).forEach((key) => {
        const schemaProperty = schema.properties?.[key];
        if (!schemaProperty) {
          return;
        }

        const isArrayCategory = schemaProperty.additionalProperties?.anyOf;

        if (isAtom(atomsMap[key])) {
          // Fix TS2322: This now correctly assigns ConfigValue to a property of Config
          result[key] = get(atomsMap[key] as ReturnType<typeof atom<ConfigValue>>);
        } else if (isArrayCategory) {
          // Fix TS2322: This now correctly assigns an array of ConfigValue to a property of Config
          const atoms = atomsMap[key] as Record<string, ReturnType<typeof atom<ConfigValue>>>;
          result[key] = Object.entries(atoms).map(([, a]) => get(a));
        } else {
          // Handle object-based categories
          const atoms = atomsMap[key] as Record<string, ReturnType<typeof atom<ConfigValue>>>;
          result[key] = {};
          Object.entries(atoms).forEach(([subkey, a]) => {
            if (typeof result[key] === 'string') return;
            (result[key] as Record<string, ConfigValue>)[subkey] = get(a);
          });
        }
      });

      result.type = schema.properties.type?.const ?? '';

      return result;
    });
  }, [atomsMap, schema]);

  const [config] = useAtom(configAtom);
  return config;
}
