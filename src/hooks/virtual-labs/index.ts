import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { ExploreESHit } from '@/types/explore-section/es';
import { ExploreSectionResource } from '@/types/explore-section/resources';

function generateDetailPageUrl(basePath: string, record: any) {
  return `${basePath}/${record.id}`;
}

export function useExploreTableOnClickHandler() {
  const router = useRouter();

  return useCallback(
    (basePath: string, record: ExploreESHit<ExploreSectionResource>) => {
      router.push(generateDetailPageUrl(basePath, record));
    },
    [router]
  );
}
