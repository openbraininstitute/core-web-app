import { HTMLProps, useCallback } from 'react';
import { useAtom } from 'jotai';
import {
  dataAtom,
  pageNumberAtom,
  previousDataAtom,
} from '@/state/explore-section/list-view-atoms';
import { classNames } from '@/util/utils';
import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType, PAGE_SIZE } from '@/constants/explore-section/list-views';
import { useLoadableValue, useUnwrappedValue } from '@/hooks/hooks';
import { VirtualLabInfo } from '@/types/virtual-lab/common';

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

export function useData(
  dataContext: {
    virtualLabInfo?: VirtualLabInfo;
    dataScope: ExploreDataScope;
    dataType: DataType;
  },
  key: string
) {
  const [prevData] = useAtom(previousDataAtom({ ...dataContext, key }));

  const data = useUnwrappedValue(
    dataAtom({
      ...dataContext,
      key,
    })
  );

  return [...prevData, ...(data?.hits ?? [])];
}

export function useLoadMore(
  dataContext: {
    virtualLabInfo?: VirtualLabInfo;
    dataScope: ExploreDataScope;
    dataType: DataType;
  },
  key: string
) {
  const [, setPrevData] = useAtom(previousDataAtom({ ...dataContext, key }));

  const res = useLoadableValue(
    dataAtom({
      ...dataContext,
      key,
    })
  );

  const data = useData(dataContext, key);

  const [pageNumber, setPageNumber] = useAtom(pageNumberAtom(key));

  const loadMore = useCallback(
    (load: boolean = true) => {
      if (res.state === 'loading' || res.state === 'hasError' || !load) return;

      if (res.data && res.data.hits.length < PAGE_SIZE) return;

      // Store previous hits before fetching next page
      setPrevData(data);
      setPageNumber(pageNumber + 1);
    },
    [pageNumber, setPageNumber, res]
  );

  return { loadMore, loading: res.state === 'loading' };
}

export default function LoadMoreButton({
  dataContext,
  dataKey,
  hide,
}: HTMLProps<HTMLButtonElement> & {
  dataContext: {
    virtualLabInfo?: VirtualLabInfo;
    dataScope: ExploreDataScope;
    dataType: DataType;
  };
  dataKey: string;
  hide: () => void;
}) {
  const { loadMore } = useLoadMore(dataContext, dataKey);

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
