import { atom, useAtom } from 'jotai';
import React from 'react';

import type { AtomsMap, JSONSchema } from '../../types';
import type { Config } from '../components';
import { isAtom } from '../utils';

export function useConfigAtom(schema: JSONSchema | null, atomsMap: AtomsMap) {
  const configAtom = React.useMemo(() => {
    return atom((get) => {
      const result: Config = {};
      Object.keys(atomsMap).forEach((key) => {
        if (isAtom(atomsMap[key])) result[key] = get(atomsMap[key]);
        else {
          result[key] = {};
          Object.entries(atomsMap[key]).forEach(([subkey, v]) => {
            if (typeof result[key] === 'string') return;
            result[key][subkey] = get(v);
          });
        }
      });

      result.type = schema?.properties?.type.const ?? '';

      return result;
    });
  }, [atomsMap, schema]);
  const [config] = useAtom(configAtom);
  return config;
}
