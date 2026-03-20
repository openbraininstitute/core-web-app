'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { useAtom } from 'jotai';
import { unwrap } from 'jotai/utils';
import { useMemo, useState } from 'react';

import { BrainRegionDropdown } from '@/features/brain-region-dropdown';
import { coreFiltersAtom } from '@/ui/segments/data-table/elements/context';
import { FilterControls } from '@/ui/segments/data-table/elements/filter-controls';
import { ListingFilterPanel } from '@/ui/segments/data-table/elements/listing-filter-panel/listing-filter-panel';
import { Pagination } from '@/ui/segments/data-table/elements/pagination';
import { Search } from '@/ui/segments/data-table/search';
import { type OnCellClick, WrapperTable } from '@/ui/segments/data-table/table';
import { cn } from '@/utils/css-class';

import type { ColumnProps, TableProps } from 'antd/es/table';
import type { RowSelectionType } from 'antd/es/table/interface';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type {
  EntityCoreIdentifiable,
  EntityCoreIdentifiableNamed,
} from '@/api/entitycore/types/shared/global';
import type { Pagination as EntitycorePagination } from '@/api/entitycore/types/shared/response';
import type { TWorkspaceScope, TWorkspaceSection } from '@/constants';
import type { WorkspaceContext } from '@/types/common';
import type { RenderButtonProps } from '@/ui/segments/data-table/elements/use-row-selection';
import type { UseExpandableTableOptions } from '@/ui/segments/data-table/expandable-row/use-expandable-table';

export type Props<T extends EntityCoreIdentifiable> = {
  resultPagination?: {
    pagination: EntitycorePagination;
    totalData: number;
  };
  dataScope?: TWorkspaceScope;
  section?: TWorkspaceSection;
  columns: ColumnProps<T>[];
  dataType: TExtendedEntitiesTypeDict;
  workspace?: WorkspaceContext;
  cls?: {
    container?: ComponentProps<'div'>['className']; // this is for the section html tag
    table?: ComponentProps<'div'>['className']; // this is for ant-table-wrapper
  };
  dataKey: string;
  selectionType?: RowSelectionType;
  onRow?: TableProps<T>['onRow'];
  sticky?: TableProps<T>['sticky'];
  onRowsSelected?: ((rows: T[]) => void) | undefined;
  renderButton?: ((props: RenderButtonProps<T>) => ReactNode) | undefined;
  onCellClick?: OnCellClick<T> | undefined;
  showLoadingState?: boolean;
  isLoading?: boolean;
  dataSource: Array<T>;
  rowClassName?: string | TableProps<T>['rowClassName'];
  tableStyle?: CSSProperties | undefined;
  allowDownload?: boolean;
  allowDelete?: boolean;
  allowFilter?: boolean;
  allowSearch?: boolean;
  requireBrainRegionDropdown?: boolean;
  filterClassNames?: {
    container?: string;
  };
  expandableOptions?: UseExpandableTableOptions<T, T> | undefined;
  showExpandButtons?: boolean;
  left?: ReactNode;
  /** when false, disables vertical scroll so the table sizes to its content (use with h-max/h-fit on container) */
  scrollable?: boolean;
};

export function MainTable<T extends EntityCoreIdentifiableNamed>({
  dataKey,
  dataScope,
  section,
  dataType,
  workspace,
  cls,
  renderButton,
  showLoadingState,
  isLoading,
  resultPagination,
  // from antd
  rowClassName,
  columns,
  dataSource,
  sticky,
  selectionType,
  onRow,
  onRowsSelected,
  onCellClick,
  tableStyle,
  allowDownload,
  allowDelete,
  allowFilter = true,
  allowSearch = true,
  requireBrainRegionDropdown = false,
  filterClassNames,
  expandableOptions,
  showExpandButtons,
  left,
  scrollable = true,
}: Props<T>) {
  const [displayControlPanel, setDisplayControlPanel] = useState(false);
  const onDisplayControlPanel = (value: boolean) => setDisplayControlPanel(value);

  const [filters, setFilters] = useAtom(
    useMemo(
      () =>
        unwrap(
          coreFiltersAtom({
            dataType,
            key: dataKey,
          })
        ),
      [dataType, dataKey]
    )
  );

  const allowTopMenu = allowSearch || allowFilter || left;

  return (
    <>
      <section
        id="data-table-with-filters"
        data-testid="data-table-with-filters"
        className={cn(
          'flex h-full w-full min-w-0 flex-col before:shadow-lg after:shadow-md',
          cls?.container
        )}
      >
        {allowTopMenu && (
          <div
            className={cn(
              'mb-5 grid w-full grid-cols-[2fr_2fr] items-center justify-center gap-5 pt-2',
              '[grid-template-areas:"search_filter"]',
              {
                '[grid-template-areas:"left_search_filter"] grid-cols-[auto_1fr_1fr] gap-2': !!left,
              }
            )}
          >
            {!!left && <div className="w-full [grid-area:left]">{left}</div>}
            {allowSearch && (
              <div className="w-full [grid-area:search]">
                <Search
                  {...{
                    dataType,
                    dataKey,
                    className: 'ml-0.5',
                  }}
                />
              </div>
            )}
            {allowFilter && (
              <div className="[grid-area:filter]">
                <div className="ml-auto flex h-12 items-stretch justify-end gap-3">
                  {requireBrainRegionDropdown && <BrainRegionDropdown dataKey={dataKey} />}
                  <FilterControls
                    filters={filters}
                    displayControlPanel={displayControlPanel}
                    setDisplayControlPanel={onDisplayControlPanel}
                    className="justify-end self-end"
                  />
                </div>
              </div>
            )}
          </div>
        )}
        <WrapperTable<T>
          dataType={dataType}
          columns={columns}
          dataSource={dataSource}
          scrollable={scrollable}
          loading={{
            indicator: <Spin indicator={<LoadingOutlined spin className="text-primary-6" />} />,
            spinning: showLoadingState && isLoading,
            size: 'large',
          }}
          workspace={workspace}
          onCellClick={onCellClick}
          renderButton={renderButton}
          selectionType={selectionType}
          onRowsSelected={onRowsSelected}
          dataKey={dataKey}
          rowClassName={rowClassName}
          tableStyle={tableStyle}
          onRow={onRow}
          sticky={sticky}
          className={cls?.table}
          allowDownload={allowDownload}
          allowDelete={allowDelete}
          expandableOptions={expandableOptions}
          showExpandButtons={showExpandButtons}
          controls={
            <div className="w-full">
              <Pagination {...{ dataKey, dataType, section, resultPagination }} />
            </div>
          }
        />
      </section>
      {displayControlPanel && filters && allowFilter && (
        <ListingFilterPanel
          data-testid="listing-view-control-panel"
          dataScope={dataScope}
          filters={filters}
          setFilters={setFilters}
          toggleDisplay={() => setDisplayControlPanel(false)}
          dataType={dataType}
          dataKey={dataKey}
          workspace={workspace}
          classNames={filterClassNames}
          section={section}
        />
      )}
    </>
  );
}

export default MainTable;
