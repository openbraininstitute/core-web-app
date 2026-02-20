import { flatMap } from 'es-toolkit/compat';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getParamLabel } from '@/entity-configuration/definitions/list-expanded-view-defs/simulation/utils';
import { getSkeletonizationStatus } from '@/entity-configuration/domain/processing/skeletonization-campaign';
import { ExecutionStatus } from '@/ui/segments/activity-execution/status';
import { BaseTable } from '@/ui/segments/data-table/table';
import { cn } from '@/utils/css-class';

import type { ListExpandedViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/types';
import type { TEnrichedSkeletonizationCampaign } from '@/entity-configuration/domain/processing/skeletonization-campaign';

const className = 'text-primary-7';

export const viewConfig: ListExpandedViewConfig<TEnrichedSkeletonizationCampaign> = {
  expandIconColumnIndex: 7,
  render: (campaign) => {
    const configs = flatMap(campaign.generations, (gen) => gen.configs);

    const allScanParamSet = configs.reduce(
      (set, config) => set.union(new Set(Object.keys(config.scan_parameters))),
      new Set<string>()
    );

    const columns = [
      {
        title: 'Name',
        className: cn(className, 'whitespace-nowrap'),
        dataIndex: 'name',
        key: 'name',
        fixed: 'left' as const,
      },

      ...Array.from(allScanParamSet).map((param) => ({
        title: <span title={param}>{getParamLabel(param)}</span>,
        className,
        dataIndex: ['scan_parameters', param],
        key: param,
      })),

      {
        title: 'Status',
        render: (config: typeof configs[number]) => (
          <ExecutionStatus status={getSkeletonizationStatus(config)} />
        ),
        width: 120,
        className,
        key: 'status',
        fixed: 'right' as const,
      },
    ];

    return (
      <div className="pr-36 pl-12">
        <BaseTable
          dataSource={configs}
          columns={columns}
          dataType={ExtendedEntitiesTypeDict.SkeletonizationCampaign}
          scrollable={false}
          className="[&_.ant-table]:bg-background! [&_.ant-table-tbody>tr>td]:bg-background! [&_.ant-table-thead>tr>th]:bg-background!"
        />
      </div>
    );
  },
  isExpandable: (campaign) => flatMap(campaign.generations, (gen) => gen.configs).length > 1,
};
