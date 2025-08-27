import { useAtomValue } from 'jotai';
import type { ReactNode } from 'react';

import { BaseTable } from '@/components/explore-section/ExploreSectionListingView/ExploreSectionTable';
import { createExpandableTableConfig } from '@/components/explore-section/ExploreSectionListingView/expandable-row/expandable-base-table';
import { useExpandableTable } from '@/components/explore-section/ExploreSectionListingView/expandable-row/use-expandable-table';
import { circuitRepresentationAtom } from '@/features/entities/circuit/elements/context';
import { expandIcon } from '@/features/entities/circuit/elements/expand-icon';
import { ArrowReturnRight } from '@/components/icons/ArrowReturnRight';
import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType } from '@/constants/explore-section/list-views';
import { VirtualLabInfo } from '@/types/virtual-lab/common';

import type { ICircuitEnriched } from '@/features/entities/circuit/elements/helpers';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

type Props = {
  circuits: Array<ICircuitEnriched>;
  columns: Array<any>;
  dataType: DataType;
  dataScope: ExploreDataScope;
  virtualLabInfo?: VirtualLabInfo;
  onCellClick?: (basePath: string, record: ICircuit) => void;
  level?: number;
};

export function RecursiveExpandableTable({
  circuits,
  columns,
  dataType,
  dataScope,
  virtualLabInfo,
  onCellClick,
  level = 0,
}: Props) {
  const view = useAtomValue(circuitRepresentationAtom);

  const expandableOptions = createExpandableTableConfig<ICircuit, VirtualLabInfo>({
    fetcher: async (record: ICircuit) => {
      const enrichedRecord = record as ICircuitEnriched;
      if (enrichedRecord.sub_circuits && enrichedRecord.sub_circuits.length > 0) {
        return enrichedRecord.sub_circuits;
      }
      return [];
    },
    fetcherParams: virtualLabInfo,
    getRowKey: (record) => `${record.id}-level-${level}`,
    getFetchId: (record) => record.id,
    isRowExpandable: (record) => {
      const enrichedRecord = record as ICircuitEnriched;
      return Boolean(enrichedRecord.sub_circuits && enrichedRecord.sub_circuits.length > 0);
    },
    expandedColumns: columns,
    expandedTableProps: {
      dataContext: {
        dataScope: ExploreDataScope.NoScope,
        dataType,
        virtualLabInfo,
      },
    },
    renderWrapper: (_: ReactNode, records: Array<ICircuit>) => {
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
                dataType={dataType}
                dataScope={dataScope}
                virtualLabInfo={virtualLabInfo}
                onCellClick={onCellClick}
                level={level + 1}
              />
            </div>
          </div>
        </div>
      );
    },
    expandIconColumnIndex: 4,
    expandIcon,
  });

  const { expandableConfig } = useExpandableTable<ICircuit, VirtualLabInfo>(expandableOptions);

  return (
    <div className="flexible-nested-table">
      <style jsx>{`
        .flexible-nested-table {
          width: 100%;
          overflow: visible;
        }

        /* Expanded row styling */
        :global(.ant-table-expanded-row > td) {
          padding: 0 !important;
          background-color: #fafafa !important;
          overflow: visible !important;
        }

        /* Nested table styling */
        .flexible-nested-table :global(.ant-table) {
          width: auto !important;
          min-width: 100% !important;
          margin: 0 !important;
          table-layout: auto !important;
        }

        /* Nested table headers match expanded row background */
        .flexible-nested-table :global(.ant-table-thead > tr > th) {
          background-color: #fafafa !important;
          border-bottom: 1px solid #f0f0f0 !important;
          color: #666 !important;
          font-weight: 500 !important;
        }

        .flexible-nested-table :global(.ant-table-tbody > tr:hover > td) {
          background-color: #f5f5f5 !important;
        }

        .flexible-nested-table :global(.ant-table-cell) {
          border-bottom: 1px solid #f0f0f0 !important;
          white-space: nowrap;
        }
      `}</style>
      <BaseTable<ICircuit>
        scrollable={false}
        columns={columns}
        dataSource={circuits}
        dataContext={{
          dataScope,
          dataType,
          virtualLabInfo,
        }}
        rowKey={(record) => `hierarchy-${record.id}`}
        onCellClick={onCellClick}
        expandableConfig={expandableConfig}
        rowClassName={(record: ICircuit) =>
          // eslint-disable-next-line no-nested-ternary
          'isFiltered' in record && record.isFiltered
            ? `filtered-in [&_td_svg]:text-primary-8!`
            : view === 'hierarchy'
              ? 'filtered-out bg-red [&_td]:bg-neutral-1! [&_td]:text-neutral-4!'
              : '[&_td_svg]:text-primary-8!'
        }
      />
    </div>
  );
}
