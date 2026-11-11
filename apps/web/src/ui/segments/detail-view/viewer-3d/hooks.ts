import React from 'react';

import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';

export function useTypeChecker(extendedType: TExtendedEntitiesTypeDict) {
  return React.useCallback(
    (...types: (keyof typeof ExtendedEntitiesTypeDict)[]) => {
      for (const type of types) {
        if (extendedType === ExtendedEntitiesTypeDict[type]) {
          return true;
        }
      }
      return false;
    },
    [extendedType]
  );
}
