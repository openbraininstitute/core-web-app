import { useMemo, useRef, useEffect } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { useLoadMore } from '@/components/explore-section/ExploreSectionListingView/LoadMoreButton';
import { ExploreDataScope } from '@/types/explore-section/application';

import { DataType } from '@/constants/explore-section/list-views';

export default function useInfiniteScroll(
  virtualLabId: string,
  projectId: string,
  dataType: DataType
) {
  const loadMoreDivRef = useRef<HTMLDivElement>(null);

  const { loadMore, loading } = useLoadMore(
    useMemo(() => {
      return {
        virtualLabInfo: {
          virtualLabId,
          projectId,
        },
        dataType,
        dataScope: ExploreDataScope.NoScope,
      };
    }, [projectId, virtualLabId, dataType])
  );

  useIntersectionObserver({
    observedRef: loadMoreDivRef,
    onIntersect: loadMore,
    rootMargin: '0px',
  });

  return (
    <div ref={loadMoreDivRef} className="flex justify-center pt-5">
      {loading && <LoadingOutlined className="text-4xl" />}
    </div>
  );
}

export function useIntersectionObserver({
  observedRef,
  onIntersect,
  rootMargin,
}: {
  observedRef: React.RefObject<HTMLElement | null>;
  onIntersect: (intersecting: boolean) => void;
  rootMargin: string;
}) {
  useEffect(() => {
    const element = observedRef.current;
    if (!element) return;

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        onIntersect(entries[0].isIntersecting);
      },
      {
        rootMargin,
      }
    );

    intersectionObserver.observe(element);

    return () => {
      intersectionObserver.unobserve(element);
      intersectionObserver.disconnect();
    };
  }, [observedRef, onIntersect, rootMargin]);
}
