import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { detailUrlBuilder } from '@/util/common';

import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

export function useExploreTableOnClickHandler<T extends EntityCoreIdentifiable>() {
  const router = useRouter();

  return useCallback(
    (basePath: string, record: T) => {
      router.push(detailUrlBuilder(basePath, record));
    },
    [router]
  );
}
