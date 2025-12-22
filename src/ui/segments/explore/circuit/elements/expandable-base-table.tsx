/* eslint-disable react/jsx-props-no-spreading */

import type { TableProps } from 'antd';
import type { ExpandableConfig } from 'antd/es/table/interface';
import type { CSSProperties, ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import { BaseTable } from '@/ui/segments/data-table/table';
import {
  type UseExpandableTableOptions,
  useExpandableTable,
} from '@/ui/segments/explore/circuit/elements/use-expandable-table';

type AdditionalTableProps<T> = {
  hasError?: boolean;
  onCellClick?: (basePath: string, record: T, type: TExtendedEntitiesTypeDict) => void;
};

type BaseTableProps<T extends EntityCoreIdentifiable> = TableProps<T> &
  AdditionalTableProps<T> & {
    scrollable?: boolean;
    expandableConfig?: ExpandableConfig<T>;
    dataType: TExtendedEntitiesTypeDict;
  };

export interface ExpandableBaseTableProps<T extends EntityCoreIdentifiable>
  extends Omit<BaseTableProps<T>, 'expandableConfig'> {
  expandableOptions: UseExpandableTableOptions<T>;
  showExpandButtons?: boolean;
}

export function ExpandableBaseTable<T extends EntityCoreIdentifiable>({
  expandableOptions,
  showExpandButtons = true,
  ...baseTableProps
}: ExpandableBaseTableProps<T>) {
  const { expandableConfig } = useExpandableTable<T>(expandableOptions);

  return (
    <BaseTable
      {...baseTableProps}
      expandableConfig={showExpandButtons ? expandableConfig : undefined}
    />
  );
}

export function createExpandableTableConfig<T extends EntityCoreIdentifiable>(
  options: Omit<UseExpandableTableOptions<T>, 'renderExpanded'> & {
    expandedColumns: any[];

    expandedTableProps: BaseTableProps<T> & Partial<BaseTableProps<T>>;
    wrapperProps?: {
      className?: string;
      style?: CSSProperties;
      id?: string;
      [key: string]: any;
    };
    renderWrapper?: (baseTable: ReactNode, records: T[], originalRecord: T) => ReactNode;
  }
): UseExpandableTableOptions<T> {
  const { expandedColumns, expandedTableProps, wrapperProps, renderWrapper, ...restOptions } =
    options;

  return {
    ...restOptions,
    renderExpanded: (records: T[], originalRecord: T): ReactNode => {
      // create the base table with enhanced props for nested styling
      const enhancedTableProps = {
        ...expandedTableProps,
        scroll: {
          x: undefined, // no horizontal scroll needed since parent will adjust
          y: undefined, // disable vertical scrolling to show all rows
          ...expandedTableProps?.scroll,
        },
        pagination: false as const, // ensure no pagination in nested table
      };

      const baseTable = (
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
          <BaseTable
            scrollable={false}
            columns={expandedColumns}
            dataSource={records}
            {...enhancedTableProps}
          />
        </div>
      );

      if (renderWrapper) {
        return renderWrapper(baseTable, records, originalRecord);
      }

      if (wrapperProps) {
        return <div {...wrapperProps}>{baseTable}</div>;
      }

      return baseTable;
    },
  };
}

export default ExpandableBaseTable;
