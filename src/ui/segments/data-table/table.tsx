'use client';

import { VerticalAlignMiddleOutlined } from '@ant-design/icons';
import { ConfigProvider, Table, TableProps } from 'antd';
import { useCallback, useRef, useState } from 'react';
import isString from 'es-toolkit/compat/isString';

import type { ExpandableConfig, RowSelectionType } from 'antd/es/table/interface';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import type { TableRef } from 'antd/es/table';

import { useOnCellRouteHandler } from '@/ui/segments/data-table/elements/hooks';
import {
  useRowSelection,
  type RenderButtonProps,
} from '@/ui/segments/data-table/elements/use-row-selection';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import TableControls from '@/ui/segments/data-table/elements/controls';
import useScrollComplete from '@/hooks/useScrollComplete';
import useResizeObserver from '@/hooks/useResizeObserver';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

import styles from '@/ui/segments/data-table/elements/table.module.css';

export type OnCellClick<T> = (basePath: string, record: T, type: TExtendedEntitiesTypeDict) => void;

function CustomTH({
  children,
  style,
  onClick,
  handleResizing,
  ...props
}: {
  children: ReactNode;
  style: CSSProperties;
  onClick: () => void;
  handleResizing: () => void;
}) {
  const modifiedStyle: CSSProperties = {
    ...style,
    fontWeight: '500',
    color: '#434343',
    verticalAlign: 'baseline',
    boxSizing: 'border-box',
    backgroundColor: 'white',
  };

  return handleResizing ? (
    <th
      {...props} /* eslint-disable-line react/jsx-props-no-spreading */
      style={{ ...modifiedStyle, padding: '16px 16px 16px 0px' }}
      className="before:content-none!"
      data-testid="column-header"
    >
      <div className="flex w-full">
        <button
          className={classNames(
            'inline-flex w-full flex-col items-start',
            '[&>.ant-table-column-sorters]:inline-flex [&>.ant-table-column-sorters]:flex-none [&>.ant-table-column-sorters]:items-start! [&>.ant-table-column-sorters]:gap-2'
          )}
          onClick={onClick}
          type="button"
        >
          {children}
        </button>
        <VerticalAlignMiddleOutlined className={styles.dragIcons} onMouseDown={handleResizing} />
      </div>
    </th>
  ) : (
    <th
      {...props} /* eslint-disable-line react/jsx-props-no-spreading */
      data-testid="column-header"
      style={modifiedStyle}
    >
      {children}
    </th>
  );
}

function CustomCell({ children, style, ...props }: { children: ReactNode; style: CSSProperties }) {
  const modifiedStyle = {
    ...style,
    padding: '14px 6pX',
  };

  return (
    <td {...props} /* eslint-disable-line react/jsx-props-no-spreading */ style={modifiedStyle}>
      {children}
    </td>
  );
}

type AdditionalTableProps<T> = {
  hasError?: boolean;
  onCellClick?: OnCellClick<T>;
};

export function BaseTable<T extends EntityCoreIdentifiable>({
  columns,
  dataSource,
  hasError,
  loading,
  onCellClick,
  rowSelection,
  showLoadMore,
  scrollable = true,
  sticky,
  expandableConfig,
  rowClassName,
  tableStyle,
  className,
  onRow,
  dataType,
  wrapperClassname,
  pagination = false,
  size,
  id,
  dataTestId,
}: TableProps<T> &
  AdditionalTableProps<T> & {
    id?: string;
    dataTestId?: string;
    showLoadMore?: (value?: boolean) => void;
    scrollable?: boolean;
    expandableConfig?: ExpandableConfig<T>;
    tableStyle?: CSSProperties | undefined;
    dataType: TExtendedEntitiesTypeDict;
    wrapperClassname?: ComponentProps<'div'>['className'];
  }) {
  const [containerDimension, setContainerDimension] = useState<{ height: number; width: number }>({
    height: 0,
    width: 0,
  });
  const tableRef = useRef<TableRef>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const tableElement: HTMLElement | null | undefined =
    tableRef.current?.nativeElement.querySelector('.ant-table-body');
  const headerElement: HTMLElement | null | undefined =
    tableRef.current?.nativeElement.querySelector('.ant-table-header');
  const headerHeight = headerElement?.getBoundingClientRect()?.height ?? 0;

  const onResize = useCallback((target: HTMLElement) => {
    setContainerDimension(target.getBoundingClientRect());
  }, []);

  // added new id explore-table-container-for-observable because we are using this component
  // outside of the explore and we want to resize the table according to the screen size as well
  useResizeObserver({
    element: wrapperRef.current ?? undefined,
    callback: onResize,
  });

  useScrollComplete({
    element: tableElement,
    callback: showLoadMore,
  });

  const onCellRouteHandler = useOnCellRouteHandler<T>({
    dataType,
    onCellClick,
  });

  // TODO: fix the render component if error found
  if (hasError) return <div>Something went wrong</div>;
  if (!columns?.length) return null;

  return (
    <div
      id="base-table-wrapper"
      ref={wrapperRef}
      className={cn('flex min-h-0 grow flex-col overflow-hidden', wrapperClassname)}
    >
      <ConfigProvider theme={{ hashed: false }}>
        <Table
          id={id}
          data-testid={dataTestId}
          size={size}
          ref={tableRef}
          sticky={sticky}
          style={tableStyle}
          aria-label="listing-view-table"
          className={cn(styles.table, 'grow [&_.ant-table-sticky-holder]:shadow-md', className)}
          columns={
            columns &&
            columns.map((col) => ({
              ...col,
              ...onCellRouteHandler(col),
            }))
          }
          components={{
            header: {
              cell: CustomTH,
            },
            body: {
              cell: CustomCell,
            },
          }}
          dataSource={dataSource}
          loading={loading}
          pagination={pagination}
          rowClassName={(row: T, index: number, indent: number) =>
            classNames(
              styles.tableRow,
              isString(rowClassName) ? rowClassName : rowClassName?.(row, index, indent)
            )
          }
          onRow={onRow}
          rowKey={(row) => row.id}
          rowSelection={rowSelection?.type ? rowSelection : undefined}
          scroll={
            scrollable
              ? {
                  x: 'fit-content',
                  y: Math.max(containerDimension.height - headerHeight, 0),
                }
              : { x: 'fit-content' }
          }
          expandable={expandableConfig}
        />
      </ConfigProvider>
    </div>
  );
}

export function WrapperTable<T extends EntityCoreIdentifiable>({
  columns,
  dataSource,
  hasError,
  loading,
  onCellClick,
  renderButton,
  selectionType,
  onRowsSelected,
  scrollable = true,
  dataKey,
  expandableConfig,
  rowClassName,
  tableStyle,
  onRow,
  className,
  dataType,
  controls,
  baseTableWrapperClassname,
  allowDownload,
}: TableProps<T> &
  AdditionalTableProps<T> & {
    renderButton?: (props: RenderButtonProps<T>) => ReactNode;
    selectionType?: RowSelectionType;
    scrollable?: boolean;
    onRowsSelected?: (rows: Array<T>) => void;
    dataKey: string;
    expandableConfig?: ExpandableConfig<T>;
    tableStyle?: CSSProperties | undefined;
    dataType: TExtendedEntitiesTypeDict;
    controls?: ReactNode;
    baseTableWrapperClassname?: ComponentProps<'div'>['className'];
    allowDownload?: boolean;
  }) {
  const { rowSelection, selectedRows, clearSelectedRows } = useRowSelection({
    dataKey,
    selectionType,
    onRowsSelected,
  });

  return (
    <>
      <BaseTable<T>
        dataType={dataType}
        columns={columns}
        dataSource={dataSource}
        hasError={hasError}
        loading={loading}
        onCellClick={onCellClick}
        rowKey={(row) => row.id}
        rowSelection={rowSelection}
        scrollable={scrollable}
        expandableConfig={expandableConfig}
        rowClassName={rowClassName}
        style={tableStyle}
        className={className}
        onRow={onRow}
        wrapperClassname={baseTableWrapperClassname}
      />
      <TableControls
        visible
        renderButton={renderButton}
        selectedRows={selectedRows}
        clearSelectedRows={clearSelectedRows}
        dataType={dataType}
        allowDownload={allowDownload}
      >
        {controls}
      </TableControls>
      {/* {(!autohideControls || (autohideControls && selectedRows.length > 0)) && (
      )} */}
    </>
  );
}
