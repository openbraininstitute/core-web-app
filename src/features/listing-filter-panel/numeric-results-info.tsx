'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { JSX, useState, useEffect } from 'react';

import { useBrainRegionHierarchy } from '@/features/brain-region-tree/v2/brain-region/context';
import { ExploreDataScope } from '@/types/explore-section/application';
import { dataAtom } from '@/state/explore-section/list-view-atoms';
import { DataType } from '@/constants/explore-section/list-views';
import { getSectionFromDataKey } from '@/utils/key-builder';
import { useLoadableValue } from '@/hooks/hooks';

import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const generateDisplayComponent = (
  data: EntityCoreResponse<any> | undefined | null
): JSX.Element => {
  if (!data || !data.pagination || !data.data) {
    return <strong>0</strong>;
  }

  const { pagination, data: resultDataItems } = data;
  let currentCount =
    pagination.page && pagination.page_size
      ? (pagination.page - 1) * pagination.page_size + resultDataItems.length
      : resultDataItems.length;
  const totalCount = pagination.total_items || 0;

  currentCount = totalCount > 0 ? currentCount : 0;

  const currentFormatted = currentCount.toLocaleString('en-US');
  const totalFormatted = totalCount.toLocaleString('en-US');
  const showFormattedResults = currentCount > 0 && totalCount > 0;

  return showFormattedResults ? (
    <span>
      <strong>{currentFormatted}</strong> of <strong>{totalFormatted}</strong>
    </span>
  ) : (
    <strong>0</strong>
  );
};

function ResultsCount({
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
  const [persistedDisplay, setPersistedDisplay] = useState<JSX.Element | null>(null);
  const { node } = useBrainRegionHierarchy({ dataKey: getSectionFromDataKey(dataKey) });
  const result = useLoadableValue(
    dataAtom({
      dataType,
      dataScope,
      workspace: virtualLabInfo,
      key: dataKey,
      brainRegionId: node.id,
    })
  );

  const hasData = result.state === 'hasData' && result.data;
  let content: JSX.Element | null = null;

  if (result.state === 'loading') {
    if (persistedDisplay) {
      content = <span className="opacity-45 backdrop-blur-sm">{persistedDisplay}</span>;
    } else {
      content = <LoadingOutlined />;
    }
  } else if (result.state === 'hasData' && result.data) {
    content = generateDisplayComponent(result.data);
  } else if (result.state === 'hasError') {
    content = null;
  } else {
    content = null;
  }

  useEffect(() => {
    if (hasData) {
      setPersistedDisplay(generateDisplayComponent(result.data));
    }
  }, [hasData]);

  return (
    <div className="flex w-full justify-start">
      <div
        className="text-primary-9 flex items-center gap-1"
        role="status"
        aria-label="listing-view-title"
      >
        <span>Results </span>
        {content}
      </div>
    </div>
  );
}

export default ResultsCount;
