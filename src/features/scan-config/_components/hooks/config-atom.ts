import React from 'react';
import { atom, useAtom } from 'jotai';

import { AtomsMap, ConfigSchema } from '../../types';
import { Config } from '../components';
import { isAtom } from '../utils';

export function useConfigAtom(schema: ConfigSchema | undefined, atomsMap: AtomsMap | null) {
  const configAtom = React.useMemo(() => {
    return atom((get) => {
      const result: Config = {};
      if (!schema || !atomsMap) return result;
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
