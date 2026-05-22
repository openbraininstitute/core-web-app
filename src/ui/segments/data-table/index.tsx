'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { useAtom } from 'jotai';
import { unwrap } from 'jotai/utils';
import { useMemo, useState } from 'react';

import { coreFiltersAtom } from '@/ui/segments/data-table/elements/context';
import { ListingFilterPanel } from '@/ui/segments/data-table/elements/listing-filter-panel/listing-filter-panel';
import { Pagination } from '@/ui/segments/data-table/elements/pagination';
import { TableTools } from '@/ui/segments/data-table/elements/table-tools';
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
import type {
  Pagination as EntitycorePagination,
  TFacets,
} from '@/api/entitycore/types/shared/response';
import type { TWorkspaceScope, TWorkspaceSection } from '@/constants';
import type { WorkspaceContext } from '@/types/common';
import type { EntityTypeSelectorProps } from '@/ui/segments/data-table/elements/entity-selector';
import type {
  RenderButtonProps,
  TableRowSelectionProps,
} from '@/ui/segments/data-table/elements/use-row-selection';
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
  searchOpenOnMount?: boolean;
  requireSpeciesSelector?: boolean;
  requireScopeSelector?: boolean;
  requireEntityTypeSelector?: EntityTypeSelectorProps & {
    enabled: boolean;
  };
  requireSearch?: boolean;
  filterClassNames?: {
    container?: string;
    speciesSelector?: string;
  };
  expandableOptions?: UseExpandableTableOptions<T, T> | undefined;
  showExpandButtons?: boolean;
  left?: ReactNode;
  /** when false, disables vertical scroll so the table sizes to its content (use with h-max/h-fit on container) */
  scrollable?: boolean;
  facets?: {
    data: TFacets | undefined;
    loading: boolean;
    error: Error | null;
  };
} & TableRowSelectionProps<T>;

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
  selectedRows,
  onCellClick,
  tableStyle,
  // us
  allowDownload,
  allowDelete,
  allowFilter = true,
  allowSearch = true,
  searchOpenOnMount = false,
  requireSpeciesSelector = false,
  requireScopeSelector = false,
  requireSearch = true,
  requireEntityTypeSelector,
  filterClassNames,
  expandableOptions,
  showExpandButtons,
  left,
  scrollable = true,
  facets,
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

  const showScope = requireScopeSelector;
  const showSpecies = requireSpeciesSelector;
  const showSearch = allowSearch && requireSearch;
  const showEntityType = requireEntityTypeSelector?.enabled ?? false;

  const showFilter = allowFilter;

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
        <TableTools
          dataKey={dataKey}
          dataType={dataType}
          searchOpenOnMount={searchOpenOnMount}
          showScope={showScope}
          showSpecies={showSpecies}
          showSearch={showSearch}
          left={left}
          showEntityType={showEntityType}
          entityTypeSelector={
            requireEntityTypeSelector?.enabled ? requireEntityTypeSelector : undefined
          }
          showFilter={showFilter}
          filters={filters}
          displayControlPanel={displayControlPanel}
          setDisplayControlPanel={onDisplayControlPanel}
          filterClassNames={filterClassNames}
        />
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
          selectedRows={selectedRows}
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
          facets={facets}
        />
      )}
    </>
  );
}

export default MainTable;
