'use client';

import { type ComponentProps, type CSSProperties, type ReactNode, useMemo, useState } from 'react';
import { unwrap } from 'jotai/utils';
import { useAtom } from 'jotai';

import type { RowSelectionType } from 'antd/es/table/interface';
import type { ColumnProps, TableProps } from 'antd/es/table';

import { ListingFilterPanel } from '@/ui/segments/data-table/elements/listing-filter-panel/listing-filter-panel';
import { ResultsCount } from '@/ui/segments/data-table/elements/listing-filter-panel/numeric-results-info';
import { FilterControls } from '@/ui/segments/data-table/elements/filter-controls';
import { coreFiltersAtom } from '@/ui/segments/data-table/elements/context';
import { OnCellClick, WrapperTable } from '@/ui/segments/data-table/table';
import { classNames } from '@/util/utils';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { RenderButtonProps } from '@/ui/segments/data-table/elements/use-row-selection';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { Facets, Pagination } from '@/api/entitycore/types/shared/response';
import type { WorkspaceScope } from '@/ui/hooks/use-query-extended-entity-type';
import type { WorkspaceContext } from '@/types/common';

export function MainTable<T extends EntityCoreIdentifiableNamed>({
  dataKey,
  dataScope,
  dataType,
  virtualLabInfo,
  cls,
  facets,
  controlsVisible,
  renderButton,
  showLoadingState,
  isLoading,
  dataCount,
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
}: {
  facets: Facets | undefined;
  dataCount?: {
    pagination: Pagination;
    dataLength: number;
  };
  dataScope?: WorkspaceScope;
  columns: ColumnProps<T>[];
  controlsVisible: boolean;
  dataType: TExtendedEntitiesTypeDict;
  virtualLabInfo?: WorkspaceContext;
  cls?: {
    container?: ComponentProps<'div'>['className']; // this is for the section
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
  rowClassName?: ComponentProps<'td'>['className'];
  tableStyle?: CSSProperties | undefined;
}) {
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
        className={classNames(
          'flex h-full w-full min-w-0 flex-col before:shadow-lg after:shadow-md',
          cls?.container
        )}
      >
        <FilterControls
          filters={filters}
          displayControlPanel={displayControlPanel}
          dataType={dataType}
          dataKey={dataKey}
          setDisplayControlPanel={onDisplayControlPanel}
          className="px-4 py-5"
        >
          <ResultsCount isLoading={isLoading} dataCount={dataCount} />
        </FilterControls>
        <WrapperTable<T>
          dataType={dataType}
          columns={columns}
          dataSource={dataSource}
          loading={showLoadingState && isLoading}
          onCellClick={onCellClick}
          renderButton={renderButton}
          selectionType={selectionType}
          controlsVisible={controlsVisible}
          onRowsSelected={onRowsSelected}
          dataKey={dataKey}
          rowClassName={rowClassName}
          tableStyle={tableStyle}
          onRow={onRow}
          sticky={sticky}
          className={cls?.table}
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
          workspace={virtualLabInfo}
        />
      )}
    </>
  );
}
