'use client';

import { CSSProperties, ReactNode, useCallback, useRef, useState } from 'react';
import { VerticalAlignMiddleOutlined } from '@ant-design/icons';
import type { ExpandableConfig, RowSelectionType } from 'antd/es/table/interface';
import { ConfigProvider, Table, TableProps } from 'antd';
import { TableRef } from 'antd/es/table';

import useRowSelection, {
  RenderButtonProps,
} from '@/components/explore-section/ExploreSectionListingView/useRowSelection';
import {
  useOnCellRouteHandler,
  useShowMore,
} from '@/components/explore-section/ExploreSectionListingView/hooks';
import LoadMoreButton from '@/components/explore-section/ExploreSectionListingView/LoadMoreButton';
import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType } from '@/constants/explore-section/list-views';
import { classNames } from '@/util/utils';

import TableControls from '@/components/listing-table/controls';
import useResizeObserver from '@/hooks/useResizeObserver';
import useScrollComplete from '@/hooks/useScrollComplete';

import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

import styles from '@/app/app/virtual-lab/(free)/explore/explore.module.css';

export type OnCellClick<T> = (basePath: string, record: T, type: DataType) => void;

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
  dataContext: {
    virtualLabInfo?: WorkspaceContext;
    dataScope: ExploreDataScope;
    dataType: DataType;
  };
  hasError?: boolean;
  onCellClick?: OnCellClick<T>;
};

function BaseTable<T extends EntityCoreIdentifiable>({
  columns,
  dataContext,
  dataSource,
  hasError,
  loading,
  onCellClick,
  rowSelection,
  showLoadMore,
  scrollable = true,
  sticky,
  expandableConfig,
}: TableProps<T> &
  AdditionalTableProps<T> & {
    showLoadMore?: (value?: boolean) => void;
    scrollable?: boolean;
    expandableConfig?: ExpandableConfig<T>;
  }) {
  const [containerDimension, setContainerDimension] = useState<{ height: number; width: number }>({
    height: 0,
    width: 0,
  });
  const tableRef = useRef<TableRef>(null);
  const tableElement: HTMLElement | null | undefined =
    tableRef.current?.nativeElement.querySelector('.ant-table-body');
  const parentElement =
    typeof document !== 'undefined'
      ? document.getElementById('interactive-data-layout') ||
        document.getElementById('explore-table-container-for-observable') ||
        document.getElementById('bookmark-list-container')
      : undefined;
  const headerHeight =
    (tableElement?.getBoundingClientRect()?.y ?? 0) -
    (parentElement?.getBoundingClientRect()?.y ?? 0);

  const onResize = useCallback((target: HTMLElement) => {
    setContainerDimension(target.getBoundingClientRect());
  }, []);

  // added new id explore-table-container-for-observable because we are using this component
  // outside of the explore and we want to resize the table according to the screen size as well
  useResizeObserver({
    element: parentElement,
    callback: onResize,
  });

  useScrollComplete({
    element: tableElement,
    callback: showLoadMore,
  });

  const onCellRouteHandler = useOnCellRouteHandler<T>({
    dataType: dataContext.dataType,
    onCellClick,
  });

  if (hasError) return <div>Something went wrong</div>;

  if (!columns?.length) return null;
  return (
    <ConfigProvider theme={{ hashed: false }}>
      <Table
        ref={tableRef}
        sticky={sticky}
        aria-label="listing-view-table"
        className={classNames(styles.table, 'grow [&_.ant-table-sticky-holder]:shadow-md')}
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
        pagination={false}
        rowClassName={styles.tableRow}
        rowKey={(row) => row.id}
        rowSelection={rowSelection}
        scroll={
          scrollable
            ? {
                x: 'fit-content',
                y: containerDimension.height - (headerHeight + 100), // 100 is to make space for load more button,
              }
            : { x: 'fit-content' }
        }
        expandable={expandableConfig}
      />
    </ConfigProvider>
  );
}

export default function ExploreSectionTable<T extends EntityCoreIdentifiable>({
  columns,
  dataContext,
  dataSource,
  hasError,
  loading,
  onCellClick,
  renderButton,
  selectionType,
  onRowsSelected,
  scrollable = true,
  controlsVisible = true,
  autohideControls = false,
  dataKey,
  useBrainRegion = true,
  expandableConfig,
}: TableProps<T> &
  AdditionalTableProps<T> & {
    renderButton?: (props: RenderButtonProps<T>) => ReactNode;
    selectionType?: RowSelectionType;
    scrollable?: boolean;
    controlsVisible?: boolean;
    onRowsSelected?: (rows: Array<T>) => void;
    autohideControls?: boolean;
    dataKey: string;
    useBrainRegion?: boolean;
    expandableConfig?: ExpandableConfig<T>;
  }) {
  const { rowSelection, selectedRows, clearSelectedRows } = useRowSelection({
    dataKey,
    selectionType,
    onRowsSelected,
  });

  const { displayLoadMoreBtn, toggleDisplayMore } = useShowMore();

  const sortedCols = columns?.sort((a, b) => {
    if (a.key === 'createdAt') return -1; // 'createdAt' goes first
    if (b.key === 'createdAt') return 1;
    if (a.key === 'registrationDate') return 1; // 'registrationDate' goes last
    if (b.key === 'registrationDate') return -1;
    if (a.key === 'creationDate') return 1; // 'creationDate' goes last
    if (b.key === 'creationDate') return -1;
    return 0; // Keep original order for everything else
  });

  return (
    <>
      <BaseTable<T>
        columns={sortedCols && [...sortedCols]}
        dataContext={dataContext}
        dataSource={dataSource}
        hasError={hasError}
        loading={loading}
        onCellClick={onCellClick}
        rowKey={(row) => row.id}
        rowSelection={rowSelection}
        showLoadMore={toggleDisplayMore}
        scrollable={scrollable}
        expandableConfig={expandableConfig}
      />
      {(!autohideControls || (autohideControls && selectedRows.length > 0)) && (
        <TableControls
          renderButton={renderButton}
          selectedRows={selectedRows}
          clearSelectedRows={clearSelectedRows}
          visible={controlsVisible}
          dataType={dataContext.dataType}
        >
          {displayLoadMoreBtn && (
            <LoadMoreButton
              hide={toggleDisplayMore}
              dataKey={dataKey}
              dataContext={dataContext}
              useBrainRegion={useBrainRegion}
            />
          )}
        </TableControls>
      )}
    </>
  );
}
