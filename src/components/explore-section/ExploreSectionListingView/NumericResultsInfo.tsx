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

  const current = res
    ? ((res.pagination.page - 1) * res.pagination.page_size + res.data.length).toLocaleString(
        'en-US'
      )
    : '';
  const total = res ? res.pagination.total_items.toLocaleString('en-US') : '';
  return (
    <div className="flex w-full justify-start">
      <div
        className="text-primary-9 flex items-center gap-1"
        role="status"
        aria-label="listing-view-title"
      >
        <span>Results </span>
        {res && (
          <strong>
            {current}/{total}
          </strong>
        )}
      </div>
    </div>
  );
}

export default NumericResultsInfo;
