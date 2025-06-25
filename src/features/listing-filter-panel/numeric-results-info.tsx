'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { JSX, useState, useEffect } from 'react';
import { match, P } from 'ts-pattern';

import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { ExploreDataScope } from '@/types/explore-section/application';
import { dataAtom } from '@/state/explore-section/list-view-atoms';
import { DataType } from '@/constants/explore-section/list-views';
import { useLoadableValue } from '@/hooks/hooks';

import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const generateDisplayComponent = (
  data: EntityCoreResponse<any> | undefined | null
): JSX.Element => {
  return match(data)
    .with(P.nullish, () => <strong>0</strong>)
    .with({ pagination: P.nullish }, () => <strong>0</strong>)
    .with({ data: P.nullish }, () => <strong>0</strong>)
    .otherwise((validData) => {
      const { pagination, data: resultDataItems } = validData;
      let currentCount =
        pagination.page && pagination.page_size
          ? (pagination.page - 1) * pagination.page_size + resultDataItems.length
          : resultDataItems.length;
      const totalCount = pagination.total_items || 0;

      currentCount = totalCount > 0 ? currentCount : 0;

      const currentFormatted = currentCount.toLocaleString('en-US');
      const totalFormatted = totalCount.toLocaleString('en-US');

      return match({ currentCount, totalCount })
        .with({ currentCount: P.when((c) => c > 0), totalCount: P.when((t) => t > 0) }, () => (
          <span>
            <strong>{currentFormatted}</strong> of <strong>{totalFormatted}</strong>
          </span>
        ))
        .otherwise(() => <strong>0</strong>);
    });
};

function ResultsCount({
  dataType,
  dataScope,
  virtualLabInfo,
  dataKey,
  useBrainRegion,
}: {
  dataType: DataType;
  dataScope: ExploreDataScope;
  virtualLabInfo?: WorkspaceContext;
  dataKey: string;
  useBrainRegion?: boolean;
}) {
  const [persistedDisplay, setPersistedDisplay] = useState<JSX.Element | null>(null);
  const { node } = useBrainRegionHierarchy({ dataKey });

  const brainRegionId = useBrainRegion ? node.id : undefined;

  const result = useLoadableValue(
    dataAtom({
      dataType,
      dataScope,
      workspace: virtualLabInfo,
      key: dataKey,
      brainRegionId,
    })
  );

  const hasData = result.state === 'hasData' && result.data;

  const content = match(result)
    .with({ state: 'loading' }, () =>
      persistedDisplay ? (
        <span className="opacity-45 backdrop-blur-sm">{persistedDisplay}</span>
      ) : (
        <LoadingOutlined />
      )
    )
    .with({ state: 'hasData', data: P.not(P.nullish) }, (res) => generateDisplayComponent(res.data))
    .with({ state: 'hasError' }, () => null)
    .otherwise(() => null);

  useEffect(() => {
    if (hasData) {
      setPersistedDisplay(generateDisplayComponent(result.data));
    }
  }, [hasData, result]);

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
