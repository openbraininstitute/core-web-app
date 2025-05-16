'use client';

import { useParams, usePathname } from 'next/navigation';
import { memo, ReactNode, Suspense, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { match } from 'ts-pattern';
import get from 'lodash/get';

import circuitsFlat from '@/components/explore-section/Circuit/content/circuits_flat';

import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { dataTabAtom } from '@/components/explore-section/ExploreInteractive/DataTypeTabs';
import { EntityTypeCount } from '@/components/entities-type-stats/stat-item';
import { EntitiesCountAtom } from '@/services/entitycore/entities-count';
import { resolveDataKey } from '@/utils/key-builder';
import {
  EntityCoreExperimentalConfiguration,
  EntityCoreModelConfiguration,
} from '@/entity-configuration/domain';

import type { BulkEntityCoreCountResult } from '@/services/entitycore/entities-count';
import type { WorkspaceContext } from '@/types/common';

type EntityTypeCountProps = {
  data: BulkEntityCoreCountResult | null;
  error: Error | null;
};

type StatsPanelProps =
  | EntityTypeCountProps
  | {
      isLoading?: boolean;
    };

type Props = {
  children: ({ data, error }: EntityTypeCountProps) => ReactNode;
};

function isEntityTypeCountProps(p: StatsPanelProps): p is EntityTypeCountProps {
  return 'data' in p;
}

export function EntityTypeStats(props: StatsPanelProps) {
  const pathName = usePathname();
  const selectedTab = useAtomValue(dataTabAtom);

  let data: BulkEntityCoreCountResult | null = null;
  let error: Error | null = null;
  let isLoading = false;

  if (isEntityTypeCountProps(props)) {
    data = props.data;
    error = props.error;
  } else {
    isLoading = !!props.isLoading;
  }

  return match(selectedTab)
    .with('experimental-data', () => (
      <>
        {Object.entries(EntityCoreExperimentalConfiguration).map(([key, value]) => {
          const href = `${pathName}/${value?.explore.basePrefix}/${value.slug}`;
          let records = '',
            isError = false;

          if (!isLoading) {
            const _result = get(data?.experimental, `${value.legacyType}`, '');
            records =
              typeof _result === 'number' ? `${_result} record${_result > 0 ? 's' : ''}` : 'error';
            isError = !!error || typeof _result === 'string';
          }

          return (
            <EntityTypeCount
              isError={isError}
              key={`count-${key}`}
              href={href}
              title={value.title}
              records={records}
              type={value.type}
              isLoading={isLoading}
            />
          );
        })}
      </>
    ))
    .with('model-data', () => (
      <>
        {Object.entries(EntityCoreModelConfiguration).map(([key, value]) => {
          const href = `${pathName}/${value?.explore.basePrefix}/${value.slug}`;
          let records = '',
            isError = false;
          if (!isLoading) {
            const _result = get(data?.model, `${value.legacyType}`, '');
            records =
              typeof _result === 'number' ? `${_result} record${_result > 0 ? 's' : ''}` : 'error';
            isError = !!error || typeof _result === 'string';
          }
          return (
            <EntityTypeCount
              isError={isError}
              key={`count-${key}`}
              href={href}
              title={value.title}
              records={records}
              type={value.type}
              isLoading={isLoading}
            />
          );
        })}
        <EntityTypeCount
          isError={false}
          key={`count-circuit`}
          href={`${pathName}/model/circuit`}
          type="Circuit"
          records={`${circuitsFlat.length} records`}
          title="Circuit"
          isLoading={isLoading}
        />
      </>
    ))
    .otherwise(() => null);

  /**
   * Daniela asked that we removed this section
   * https://github.com/openbraininstitute/prod-explore-functionality/issues/47
   */
  // if (dataTypeActiveTab === 'literature') {
  //   component = <LiteratureForExperimentType />;
  // }
}

function EntityTypeStatsPanelContainer({ children }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const { node } = useBrainRegionHierarchy({
    dataKey: resolveDataKey({ section: 'explore', projectId }),
  });

  const { data, error } = useAtomValue(
    useMemo(
      () => EntitiesCountAtom({ virtualLabId, projectId, brainRegionId: node.id }),
      [virtualLabId, projectId, node.id]
    )
  );

  return (
    <div className="relative grid h-full grid-flow-row grid-cols-2 gap-x-3 gap-y-1 p-4 pt-0">
      {children({ data, error })}
    </div>
  );
}

function EntityTypeStatsPanel() {
  return (
    <Suspense
      name="entity-type-stats-panel"
      fallback={
        <div className="relative grid h-full grid-flow-row grid-cols-2 gap-x-3 gap-y-1 p-4 pt-0">
          <EntityTypeStats isLoading />
        </div>
      }
    >
      <EntityTypeStatsPanelContainer>
        {({ data, error }) => <EntityTypeStats {...{ data, error }} />}
      </EntityTypeStatsPanelContainer>
    </Suspense>
  );
}

export default memo(EntityTypeStatsPanel);
