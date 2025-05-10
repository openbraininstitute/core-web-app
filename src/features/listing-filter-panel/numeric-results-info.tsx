'use client';

import { useBrainRegionHierarchy } from '../brain-region-tree/v2/brain-region/context';
import { ExploreDataScope } from '@/types/explore-section/application';
import { dataAtom } from '@/state/explore-section/list-view-atoms';
import { DataType } from '@/constants/explore-section/list-views';
import { useUnwrappedValue } from '@/hooks/hooks';

import type { WorkspaceContext } from '@/types/common';

function NumericResultsInfo({
  dataType,
  dataScope,
  virtualLabInfo,
  dataKey,
}: {
  dataType: DataType;
  dataScope: ExploreDataScope;
  virtualLabInfo?: WorkspaceContext;
  dataKey: string;
}) {
  const { node } = useBrainRegionHierarchy({ dataKey: dataKey });
  const res = useUnwrappedValue(
    dataAtom({
      dataType,
      dataScope,
      workspace: virtualLabInfo,
      key: dataKey,
      brainRegionId: node.id,
    })
  );
  let current = res ? (res.pagination.page - 1) * res.pagination.page_size + res.data.length : 0;

  const total = res ? res.pagination.total_items : 0;
  current = total > 0 ? current : 0;
  const currentFormatted = current.toLocaleString('en-US');
  const totalFormatted = total.toLocaleString('en-US');
  const showFormattedResults = Boolean(current) && Boolean(total);

  return (
    <div className="flex w-full justify-start">
      <div
        className="text-primary-9 flex items-center gap-1"
        role="status"
        aria-label="listing-view-title"
      >
        <span>Results </span>
        {res && showFormattedResults ? (
          <strong>
            {currentFormatted}/{totalFormatted}
          </strong>
        ) : (
          <strong>0</strong>
        )}
      </div>
    </div>
  );
}

export default NumericResultsInfo;
