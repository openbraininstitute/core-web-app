import { atom, useAtom } from 'jotai';
import React from 'react';

import { isAtom, isPlainObject } from '@/features/scan-config/components/utils';

import type { AtomsMap, Config, ConfigSchema } from '@/features/scan-config/types';

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
            if (!isPlainObject(result[key])) return;
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
