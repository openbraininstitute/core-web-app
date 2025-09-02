'use client';

import { useParams, usePathname } from 'next/navigation';
import { memo, ReactNode, Suspense, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { match } from 'ts-pattern';
import get from 'lodash/get';

import { dataTabAtom } from '@/components/explore-section/ExploreInteractive/interactive/entity-group-tab';
import { useFilteredCircuits } from '@/components/explore-section/Circuit/ListView/ExploreCircuitTable';
import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { EntityTypeCount } from '@/components/entities-type-stats/stat-item';
import { entitiesCountAtom } from '@/services/entitycore/entities-count';
import { tempIsCircuitInDev } from '@/temp-circuit-check';
import {
  ExperimentalEntitiesTileTypes,
  ModelEntitiesTileTypes,
} from '@/components/entities-type-stats/helpers';

import type { EntityCountResponse } from '@/api/entitycore/types/entities/entity';
import type { WorkspaceContext } from '@/types/common';

type EntityTypeCountProps = {
  dataKey: string;
  data: EntityCountResponse | null;
  error: Error | null;
};

type StatsPanelProps =
  | EntityTypeCountProps
  | {
      dataKey: string;
      isLoading?: boolean;
    };

type Props = {
  dataKey: string;
  children: ({ data, error }: EntityTypeCountProps) => ReactNode;
};

function isEntityTypeCountProps(p: StatsPanelProps): p is EntityTypeCountProps {
  return 'data' in p;
}

function EntityTypeStats(props: StatsPanelProps) {
  const pathName = usePathname();
  const selectedTab = useAtomValue(dataTabAtom);
  const { error: circuitError, filteredCircuits } = useFilteredCircuits({ dataKey: props.dataKey });
  let data: EntityCountResponse | null = null;
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
        {Object.entries(ExperimentalEntitiesTileTypes).map(([key, value]) => {
          const href = `${pathName}/${value?.explore.basePrefix}/${value.slug}`;
          let records = '';
          let isError = false;

          if (!isLoading) {
            const tmpResult = get(data, `${value.type}`, '');
            records =
              typeof tmpResult === 'number'
                ? `${tmpResult} record${tmpResult > 0 ? 's' : ''}`
                : 'error';
            isError = !!error || typeof tmpResult === 'string';
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
        {Object.entries(ModelEntitiesTileTypes).map(([key, value]) => {
          const href = `${pathName}/${value?.explore.basePrefix}/${value.slug}`;
          let records = '';
          let isError = false;
          if (!isLoading) {
            const tmpResult = get(data, `${value.type}`, '');
            records =
              typeof tmpResult === 'number'
                ? `${tmpResult} record${tmpResult > 0 ? 's' : ''}`
                : 'error';
            isError = !!error || typeof tmpResult === 'string';
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
        {!tempIsCircuitInDev() && (
          <EntityTypeCount
            isError={!!circuitError}
            key="count-circuit-1"
            href={`${pathName}/model/circuit`}
            type="Circuit"
            records={`${filteredCircuits.count} record${filteredCircuits.count !== 1 ? 's' : ''}`}
            title="Circuit"
            isLoading={false}
          />
        )}
      </>
    ))
    .otherwise(() => null);
}

function EntityTypeStatsPanelContainer({ children, dataKey }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const { node } = useBrainRegionHierarchy({ dataKey });

  const { data, error } = useAtomValue(
    useMemo(
      () => entitiesCountAtom({ virtualLabId, projectId, brainRegionId: node.id }),
      [virtualLabId, projectId, node.id]
    )
  );

  return (
    <div className="relative grid h-full grid-flow-row grid-cols-2 gap-x-3 gap-y-1 p-4 pt-0">
      {children({ data, error, dataKey })}
    </div>
  );
}

function EntityTypeStatsPanel({ dataKey }: { dataKey: string }) {
  return (
    <Suspense
      name="entity-type-stats-panel"
      fallback={
        <div className="relative grid h-full grid-flow-row grid-cols-2 gap-x-3 gap-y-1 p-4 pt-0">
          <EntityTypeStats dataKey={dataKey} isLoading />
        </div>
      }
    >
      <EntityTypeStatsPanelContainer dataKey={dataKey}>
        {({ data, error }) => <EntityTypeStats {...{ data, error, dataKey }} />}
      </EntityTypeStatsPanelContainer>
    </Suspense>
  );
}

export default memo(EntityTypeStatsPanel);
