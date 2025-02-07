import { dataAtom } from '@/state/explore-section/list-view-atoms';
import { ExploreDataScope } from '@/types/explore-section/application';
import { useUnwrappedValue } from '@/hooks/hooks';
import { DataType } from '@/constants/explore-section/list-views';
import { VirtualLabInfo } from '@/types/virtual-lab/common';

function NumericResultsInfo({
  dataType,
  dataScope,
  virtualLabInfo,
  dataKey,
}: {
  dataType: DataType;
  dataScope: ExploreDataScope;
  virtualLabInfo?: VirtualLabInfo;
  dataKey: string;
}) {
  const res = useUnwrappedValue(dataAtom({ dataType, dataScope, virtualLabInfo, key: dataKey }));

  if (!res) return null;
  return (
    <div className="flex w-full justify-start">
      <div
        className="flex items-center gap-1 text-primary-9"
        role="status"
        aria-label="listing-view-title"
      >
        <span>Results </span>
        <strong>{res?.pagination.total_items.toLocaleString('en-US')}</strong>
      </div>
    </div>
  );
}

export default NumericResultsInfo;
