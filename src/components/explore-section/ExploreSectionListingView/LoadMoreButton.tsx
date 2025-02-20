import { HTMLProps } from 'react';
import { useAtom } from 'jotai';
import { pageSizeAtom, dataAtom } from '@/state/explore-section/list-view-atoms';
import { classNames } from '@/util/utils';
import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType, PAGE_SIZE } from '@/constants/explore-section/list-views';
import { useUnwrappedValue } from '@/hooks/hooks';
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

export default function LoadMoreButton({
  dataContext,
  hide,
}: HTMLProps<HTMLButtonElement> & {
  dataContext: {
    virtualLabInfo?: VirtualLabInfo;
    dataScope: ExploreDataScope;
    dataType: DataType;
  };
  hide: () => void;
}) {
  const res = useUnwrappedValue(
    dataAtom({
      ...dataContext,
      key: dataContext.virtualLabInfo?.projectId ?? '' + dataContext.dataType,
    })
  );

  const [contentSize, setContentSize] = useAtom(pageSizeAtom);

  const onLoadMore = () => {
    setContentSize(contentSize + PAGE_SIZE);
    hide();
  };

  if (res?.total && contentSize > res.total.value) return null;

  return (
    <Btn className="bg-primary-8 text-white" onClick={onLoadMore}>
      <span>Load {PAGE_SIZE} more results...</span>
    </Btn>
  );
}
