import { ReactNode, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';

import useExploreColumns from '@/hooks/useExploreColumns';
import { BaseTable } from '@/components/explore-section/ExploreSectionListingView/ExploreSectionTable';
import { activeColumnsAtom } from '@/state/explore-section/list-view-atoms';

import { createExpandableTableConfig } from '@/components/explore-section/ExploreSectionListingView/expandable-row/expandable-base-table';
import { useExpandableTable } from '@/components/explore-section/ExploreSectionListingView/expandable-row/use-expandable-table';
import { RecursiveExpandableTable } from '@/features/entities/circuit/elements/recursive-expandable-table';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { HierarchyOutputNode } from '@/features/entities/circuit/elements/context';
import { expandIcon } from '@/features/entities/circuit/elements/expand-icon';
import { ArrowReturnRight } from '@/components/icons/ArrowReturnRight';
import { ExploreDataScope } from '@/types/explore-section/application';
import { resolveExploreDetailsPageUrl2 } from '@/utils/url-builder';
import { VirtualLabInfo } from '@/types/virtual-lab/common';

import type { ICircuitEnriched } from '@/features/entities/circuit/elements/helpers';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  data: HierarchyOutputNode[] | undefined;
};

export function Subcircuits({ data }: Props) {
  const { push: navigate } = useRouter();
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const cols = useExploreColumns<ICircuit>(
    undefined,
    undefined,
    [],
    ExtendedEntitiesTypeDict.Circuit
  );

  const activeColumns = useAtomValue(
    useMemo(
      () =>
        unwrap(
          activeColumnsAtom({
            dataType: ExtendedEntitiesTypeDict.Circuit,
            dataScope: ExploreDataScope.NoScope,
            brainRegionId: undefined,
            key: '',
          })
        ),
      []
    )
  );
  const columns = cols.filter(({ key }) => (activeColumns || []).includes(key as string));

  const onCellClick = (basePath: string, record: ICircuit) => {
    navigate(
      resolveExploreDetailsPageUrl2({
        ctx: { virtualLabId, projectId },
        dataType: ExtendedEntitiesTypeDict.Circuit,
        entityId: record.id,
      })
    );
  };

  const expandableOptions = createExpandableTableConfig<ICircuit, VirtualLabInfo>({
    fetcher: async (record: ICircuit) => {
      // Check if this circuit has subcircuits (it should be enriched at this point)
      const enrichedRecord = record as ICircuitEnriched;
      if (enrichedRecord.sub_circuits && enrichedRecord.sub_circuits.length > 0) {
        return enrichedRecord.sub_circuits;
      }
      return [];
    },
    getRowKey: (record) => record.id,
    getFetchId: (record) => record.id,
    isRowExpandable: (record) => {
      const enrichedRecord = record as ICircuitEnriched;
      return Boolean(enrichedRecord.sub_circuits && enrichedRecord.sub_circuits.length > 0);
    },
    expandedTableProps: {
      dataContext: {
        dataScope: ExploreDataScope.NoScope,
        dataType: ExtendedEntitiesTypeDict.Circuit,
        virtualLabInfo: { virtualLabId, projectId },
      },
    },
    expandedColumns: columns,
    renderWrapper: (baseTable: ReactNode, records: Array<ICircuit>) => {
      return (
        <div className="my-5 flex flex-col items-start gap-5">
          <div className="ml-2 flex flex-row items-center gap-2">
            <ArrowReturnRight className="text-neutral-4 text-3xl" />
            <div className="text-neutral-4 text-lg font-semibold uppercase">subcircuits</div>
          </div>
          <div className="w-full">
            <div className="ml-4">
              <RecursiveExpandableTable
                circuits={records as Array<ICircuitEnriched>}
                columns={columns}
                dataType={ExtendedEntitiesTypeDict.Circuit}
                dataScope={ExploreDataScope.NoScope}
                onCellClick={onCellClick}
                level={1}
              />
            </div>
          </div>
        </div>
      );
    },
    expandIconColumnIndex: 4,
    expandIcon,
    isTopLevel: true, // this is the main table that should sync with filter resets
  });

  const { expandableConfig } = useExpandableTable<ICircuit, VirtualLabInfo>(expandableOptions);

  return (
    <>
      <BaseTable
        loading={false}
        columns={columns}
        dataContext={{
          dataScope: ExploreDataScope.NoScope,
          virtualLabInfo: undefined,
          dataType: ExtendedEntitiesTypeDict.Circuit,
        }}
        dataSource={data}
        onCellClick={onCellClick}
        expandableConfig={expandableConfig}
        rowKey={(record: ICircuit) => `subcircuits-hierarchy-${record.id}`}
      />
    </>
  );
}
