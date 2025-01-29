import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { detailUrlBuilder } from '@/util/common';
import { ExploreESHit } from '@/types/explore-section/es';
import { ExploreSectionResource } from '@/types/explore-section/resources';

export function useExploreTableOnClickHandler() {
  const router = useRouter();

  return useCallback(
    (basePath: string, record: ExploreESHit<ExploreSectionResource>) => {
      router.push(detailUrlBuilder(basePath, record));
    },
    [router]
  );
}
