import { usePathname } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { match } from 'ts-pattern';
import { ReactNode, use } from 'react';
import get from 'lodash/get';

import circuitsFlat from '@/components/explore-section/Circuit/content/circuits_flat';

import { dataTabAtom } from '@/components/explore-section/ExploreInteractive/DataTypeTabs';
import { EntityTypeCount } from './stat-item';
import {
  EntityCoreExperimentalConfiguration,
  EntityCoreModelConfiguration,
} from '@/entity-configuration/domain';

import type { BulkEntityCoreCountResult } from '@/services/entitycore/entities-types-count';
import type { Result } from '@/api/utils';

type StatsPanelProps = {
  pathName: string;
  selectedTab: 'experimental-data' | 'model-data';
  data: BulkEntityCoreCountResult | null;
  error: Error | null;
};

type Props = {
  entityCounterPromise: Promise<Result<BulkEntityCoreCountResult, Error>>;
  children: ({ pathName, selectedTab, data, error }: StatsPanelProps) => ReactNode;
};

export default function EntityTypeStatsPanelContainer({ entityCounterPromise, children }: Props) {
  const pathName = usePathname();
  const dataTypeActiveTab = useAtomValue(dataTabAtom);
  const { data, error } = use(entityCounterPromise);

  return (
    <div className="relative grid h-full grid-flow-row grid-cols-2 gap-x-3 gap-y-1 p-4 pt-0">
      {children({ pathName: pathName, selectedTab: dataTypeActiveTab, data, error })}
    </div>
  );
}

export function EntityTypeStatsPanel({ pathName, selectedTab, data, error }: StatsPanelProps) {
  return match(selectedTab)
    .with('experimental-data', () => (
      <>
        {Object.entries(EntityCoreExperimentalConfiguration).map(([key, value]) => {
          const href = `${pathName}/${value?.explore.basePrefix}/${value.slug}`;
          const _result = get(data?.experimental, `${value.legacyType}`, '');
          const records =
            typeof _result === 'number' ? `${_result} record${_result > 0 ? 's' : ''}` : 'error';
          const isError = !!error || typeof _result === 'string';

          return (
            <EntityTypeCount
              isError={isError}
              key={`count-${key}`}
              href={href}
              title={value.title}
              records={records}
              type={value.type}
            />
          );
        })}
      </>
    ))
    .with('model-data', () => (
      <>
        {Object.entries(EntityCoreModelConfiguration).map(([key, value]) => {
          const href = `${pathName}/${value?.explore.basePrefix}/${value.slug}`;
          const _result = get(data?.model, `${value.legacyType}`, '');
          const records =
            typeof _result === 'number' ? `${_result} record${_result > 0 ? 's' : ''}` : 'error';
          const isError = !!error || typeof _result === 'string';

          return (
            <EntityTypeCount
              isError={isError}
              key={`count-${key}`}
              href={href}
              title={value.title}
              records={records}
              type={value.type}
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
