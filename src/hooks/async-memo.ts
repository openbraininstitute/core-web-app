import React from 'react';
import { useCacheLastRecentlyInserted } from './cache';
import { logError } from '@/util/logger';

const DEFAULT_MAKE_KEY = (param: unknown) => JSON.stringify(param);

export function useAsyncMemo<Param, Result>(
  param: Param,
  generate: (param: Param) => Promise<Result>,
  options?: Partial<{
    makeKey?: (param: Param) => string;
  }>
): Result | null | undefined {
  const [value, setValue] = React.useState<Result | null | undefined>(undefined);
  const cache = useCacheLastRecentlyInserted<Result | null | undefined>();
  const makeKey = options?.makeKey ?? DEFAULT_MAKE_KEY;
  const key = makeKey(param);

  React.useEffect(() => {
    if (cache.has(key)) {
      setValue(cache.get(key));
    } else {
      generate(param)
        .then((item) => {
          cache.set(key, item);
          setValue(item);
        })
        .catch((error) => {
          logError('Unable to generate item for param:', param, error);
        });
    }
  }, [cache, generate, key, param]);

  return value;
}
