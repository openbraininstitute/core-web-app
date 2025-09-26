'use client';

import { useMemo, useState } from 'react';
import { unwrap } from 'jotai/utils';
import { useAtom } from 'jotai';

import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import type { RowSelectionType } from 'antd/es/table/interface';
import type { ColumnProps, TableProps } from 'antd/es/table';

import { ListingFilterPanel } from '@/ui/segments/data-table/elements/listing-filter-panel/listing-filter-panel';
import { BrainRegionDropdown } from '@/features/brain-region-dropdown';
import { FilterControls } from '@/ui/segments/data-table/elements/filter-controls';
import { coreFiltersAtom } from '@/ui/segments/data-table/elements/context';
import { OnCellClick, WrapperTable } from '@/ui/segments/data-table/table';
import { Pagination } from '@/ui/segments/data-table/elements/pagination';
import { Search } from '@/ui/segments/data-table/search';
import { WorkspaceScope } from '@/constants';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { RenderButtonProps } from '@/ui/segments/data-table/elements/use-row-selection';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type {
  Facets,
  Pagination as EntitycorePagination,
} from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';
import type { TWorkspaceScope } from '@/constants';

export type Props<T> = {
  facets: Facets | undefined;
  resultPagination?: {
    pagination: EntitycorePagination;
    totalData: number;
  };
  dataScope?: TWorkspaceScope;
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
};

export function MainTable<T extends EntityCoreIdentifiableNamed>({
  dataKey,
  dataScope,
  dataType,
  workspace,
  cls,
  facets,
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
        <div
          className={cn(
            'mb-5 grid w-full grid-cols-[2fr_2fr] items-center justify-center gap-5 pt-2',
            '[grid-template-areas:"search_pagination_filter"]'
          )}
        >
          <div className="w-full [grid-area:search]">
            <Search {...{ dataType, dataKey, className: 'pl-2' }} />
          </div>
          <div className="[grid-area:filter]">
            <div className="ml-auto flex h-12 items-stretch justify-center gap-3">
              {(dataScope === WorkspaceScope.BuildMeModelM ||
                dataScope === WorkspaceScope.BuildMeModelE ||
                dataScope === WorkspaceScope.BuildSynaptomeModel) && (
                <BrainRegionDropdown dataKey={dataKey} />
              )}
              <FilterControls
                filters={filters}
                displayControlPanel={displayControlPanel}
                setDisplayControlPanel={onDisplayControlPanel}
                className="justify-end self-end"
              />
            </div>
          </div>
        </div>
        <WrapperTable<T>
          dataType={dataType}
          columns={columns}
          dataSource={dataSource}
          loading={showLoadingState && isLoading}
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
          controls={
            <div className="w-full">
              <Pagination {...{ dataKey, resultPagination }} />
            </div>
          }
        />
      </section>
      {displayControlPanel && filters && (
        <ListingFilterPanel
          data-testid="listing-view-control-panel"
          dataScope={dataScope}
          filters={filters}
          setFilters={setFilters}
          toggleDisplay={() => setDisplayControlPanel(false)}
          dataType={dataType}
          dataKey={dataKey}
          facets={facets}
          workspace={workspace}
        />
      )}
    </>
  );
}

export default MainTable;
