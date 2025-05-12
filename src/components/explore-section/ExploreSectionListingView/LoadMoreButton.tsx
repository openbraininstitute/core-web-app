import { HTMLProps, useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';

import {
  dataAtom,
  useDataAtom,
  pageNumberAtom,
  previousDataAtom,
} from '@/state/explore-section/list-view-atoms';
import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { ExploreDataScope } from '@/types/explore-section/application';
import { PAGE_SIZE } from '@/constants/explore-section/list-views';
import { VirtualLabInfo } from '@/types/virtual-lab/common';
import { useLoadableValue } from '@/hooks/hooks';
import { classNames } from '@/util/utils';

import type { DataType } from '@/constants/explore-section/list-views';

function Btn({ children, className, disabled, onClick }: HTMLProps<HTMLButtonElement>) {
  return (
    <button
      className={classNames('mx-auto rounded-full px-12 py-3 font-normal', className)}
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label="load-more-resources-button"
    >
      {children}
    </button>
  );
}

export function useLoadMore<T>(
  dataContext: {
    workspace?: VirtualLabInfo;
    dataScope: ExploreDataScope;
    dataType: DataType;
  },
  key: string,
  useBrainRegion?: boolean
) {
  const { node } = useBrainRegionHierarchy({ dataKey: key });

  const [pageNumber, setPageNumber] = useAtom(pageNumberAtom(key));
  const setPrevData = useSetAtom(
    previousDataAtom({ ...dataContext, brainRegionId: useBrainRegion ? node.id : undefined, key })
  );
  const data = useDataAtom<T>({
    ...dataContext,
    key,
    brainRegionId: useBrainRegion ? node.id : undefined,
  });
  const res = useLoadableValue(
    dataAtom({
      ...dataContext,
      brainRegionId: useBrainRegion ? node.id : undefined,
      key,
    })
  );

  const loading = res.state === 'loading';
  const showLoadMore =
    res.state === 'hasData' &&
    res.data.data.length + (res.data.pagination.page - 1) * PAGE_SIZE <
      res.data.pagination.total_items;

  const loadMore = useCallback(
    (load: boolean = true) => {
      if (res.state === 'loading' || res.state === 'hasError' || !load) return;
      if (res.data && res.data.data.length < PAGE_SIZE) return;

      // Store previous hits before fetching next page
      setPrevData(data);
      setPageNumber(pageNumber + 1);
    },
    [pageNumber, setPageNumber, res, data, setPrevData]
  );

  return {
    loadMore,
    loading,
    showLoadMore,
  };
}

export default function LoadMoreButton({
  dataContext,
  dataKey,
  hide,
  useBrainRegion,
}: HTMLProps<HTMLButtonElement> & {
  dataContext: {
    virtualLabInfo?: VirtualLabInfo;
    dataScope: ExploreDataScope;
    dataType: DataType;
  };
  dataKey: string;
  hide: () => void;
  useBrainRegion?: boolean;
}) {
  const { loadMore, showLoadMore } = useLoadMore(dataContext, dataKey, useBrainRegion);

  if (!showLoadMore) return null;
  return (
    <Btn
      className="bg-primary-8 text-white"
      onClick={() => {
        loadMore();
        hide();
      }}
    >
      <span>Load {PAGE_SIZE} more results...</span>
    </Btn>
  );
}
