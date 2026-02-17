import { ArrowReturnRight } from '@/components/icons/ArrowReturnRight';
import { BaseTable } from '@/ui/segments/data-table/table';
import { expandIcon } from '@/ui/segments/explore/circuit/elements/expand-icon';
import { createExpandableTableConfig } from '@/ui/segments/explore/circuit/elements/expandable-base-table';
import { useExpandableTable } from '@/ui/segments/explore/circuit/elements/use-expandable-table';

import type { ReactNode } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceScope } from '@/constants';
import type { WorkspaceContext } from '@/types/common';
import type {
  ICircuitEnriched,
  TCircuitRepresentationView,
} from '@/ui/segments/explore/circuit/helpers';

type Props = {
  id?: string;
  circuits: Array<ICircuitEnriched>;
  columns: Array<any>;
  dataType: TExtendedEntitiesTypeDict;
  dataScope: TWorkspaceScope | null;
  workspace?: WorkspaceContext;
  onCellClick?: (basePath: string, record: ICircuit) => void;
  level?: number;
  view: TCircuitRepresentationView | null;
};

export function RecursiveExpandableTable({
  id,
  circuits,
  columns,
  dataType,
  dataScope,
  workspace,
  onCellClick,
  level = 0,
  view,
}: Props) {
  const expandableOptions = createExpandableTableConfig<ICircuit | ICircuitEnriched>({
    data: ((record: ICircuit | ICircuitEnriched) => {
      const enrichedRecord = record as ICircuitEnriched;
      if (enrichedRecord.sub_circuits && enrichedRecord.sub_circuits.length > 0) {
        return enrichedRecord.sub_circuits;
      }
      return [];
    }) as any,
    getRowKey: (record) => `hierarchy-${record.id}-level-${level}`,
    isRowExpandable: (record) => {
      const enrichedRecord = record as ICircuitEnriched;
      return Boolean(enrichedRecord.sub_circuits && enrichedRecord.sub_circuits.length > 0);
    },
    expandedColumns: columns,
    expandedTableProps: {
      dataType,
    },
    renderWrapper: (_: ReactNode, records: Array<ICircuit>) => {
      return (
        <div className="my-5 flex flex-col items-start gap-5">
          <div className="ml-7 flex flex-row items-center gap-2">
            <ArrowReturnRight className="text-neutral-3 text-3xl" />
            <div className="text-neutral-3 text-lg font-semibold uppercase">subcircuits</div>
          </div>
          <div className="w-full">
            <div className="ml-4">
              <RecursiveExpandableTable
                key={`${id}-level-${level + 1}`}
                circuits={records as Array<ICircuitEnriched>}
                columns={columns}
                dataType={dataType}
                dataScope={dataScope}
                workspace={workspace}
                onCellClick={onCellClick}
                view={view}
                level={level + 1}
              />
            </div>
          </div>
        </div>
      );
    },
    expandIconColumnIndex: 3,
    expandIcon,
  });

  const { expandableConfig } = useExpandableTable<ICircuit>({
    ...expandableOptions,
    isNested: level > 0,
  });

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
        key={id}
        scrollable={false}
        columns={columns}
        dataSource={circuits}
        dataType={dataType}
        rowKey={(record) => `hierarchy-${record.id}-level-${level}`}
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
