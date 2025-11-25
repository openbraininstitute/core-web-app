import { ReactNode, CSSProperties } from 'react';
import { TableProps } from 'antd';
import type { ExpandableConfig } from 'antd/es/table/interface';

import { BaseTable } from '@/ui/segments/data-table/table';
import { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  useExpandableTable,
  UseExpandableTableOptions,
} from '@/ui/segments/data-table/expandable-row/use-expandable-table';
import { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import { ExploreDataScope } from '@/types/explore-section/application';

import type { WorkspaceContext } from '@/types/common';

type AdditionalTableProps<T> = {
  dataContext: {
    virtualLabInfo?: WorkspaceContext;
    dataScope: ExploreDataScope;
    dataType: TExtendedEntitiesTypeDict;
  };
  hasError?: boolean;
  onCellClick?: (basePath: string, record: T, type: TExtendedEntitiesTypeDict) => void;
};

type BaseTableProps<T extends EntityCoreIdentifiable> = TableProps<T> &
  AdditionalTableProps<T> & {
    showLoadMore?: (value?: boolean) => void;
    scrollable?: boolean;
    expandableConfig?: ExpandableConfig<T>;
    dataType: TExtendedEntitiesTypeDict;
  };

export interface ExpandableBaseTableProps<T extends EntityCoreIdentifiable, P = unknown>
  extends Omit<BaseTableProps<T>, 'expandableConfig'> {
  /**
   * expandable table configuration
   */
  expandableOptions: UseExpandableTableOptions<T, P>;
  /**
   * show expand/collapse buttons
   */
  showExpandButtons?: boolean;
  dataType: TExtendedEntitiesTypeDict;
}

/**
 * wrapper around BaseTable that provides expandable functionality with caching and hierarchy support
 */
export function ExpandableBaseTable<T extends EntityCoreIdentifiable, P = unknown>({
  expandableOptions,
  showExpandButtons = true,
  ...baseTableProps
}: ExpandableBaseTableProps<T, P>) {
  const { expandableConfig } = useExpandableTable<T, P>(expandableOptions);

  return (
    <BaseTable
      {...baseTableProps}
      expandableConfig={showExpandButtons ? expandableConfig : undefined}
    />
  );
}

/**
 * helper function to create expandable table configurations for common use cases
 */
export function createExpandableTableConfig<T extends EntityCoreIdentifiable, P = unknown>(
  options: Omit<UseExpandableTableOptions<T, P>, 'renderExpanded'> & {
    /**
     * columns to use in the expanded table
     */
    expandedColumns: Array<any>;
    /**
     * additional props to pass to the expanded BaseTable (dataContext is required)
     */
    expandedTableProps: Pick<BaseTableProps<T>, 'dataType'> & Partial<BaseTableProps<T>>;
    /**
     * simple wrapper props for basic styling (className, style, etc.)
     * if provided, wraps the table in a div with these props
     */
    wrapperProps?: {
      className?: string;
      style?: CSSProperties;
      id?: string;
      [key: string]: any;
    };
    /**
     * optional custom wrapper function for advanced styling and wrapping of the nested table
     * takes precedence over wrapperProps if both are provided
     * @param baseTable - the BaseTable component to wrap
     * @param records - the data records being displayed
     * @param originalRecord - the parent record that was expanded
     * @returns JSX element with custom wrapper/styling
     */
    renderWrapper?: (baseTable: ReactNode, records: Array<T>, originalRecord: T) => ReactNode;
  }
): UseExpandableTableOptions<T, P> {
  const { expandedColumns, expandedTableProps, wrapperProps, renderWrapper, ...restOptions } =
    options;

  return {
    ...restOptions,
    renderExpanded: (records: Array<T>, originalRecord: T, isLoading: boolean): ReactNode => {
      if (isLoading) {
        return <div style={{ padding: '16px', textAlign: 'center' }}>Loading...</div>;
      }

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
          {/* eslint-disable-next-line react/no-unknown-property */}
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
