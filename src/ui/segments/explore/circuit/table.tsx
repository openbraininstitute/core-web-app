'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { unwrap } from 'jotai/utils';
import { useAtom } from 'jotai';
import { Spin } from 'antd';

import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import type { ExpandableConfig, RowSelectionType } from 'antd/es/table/interface';
import type { ColumnProps, TableProps } from 'antd/es/table';

import { ListingFilterPanel } from '@/ui/segments/data-table/elements/listing-filter-panel/listing-filter-panel';
import { CircuitViewToggle } from '@/ui/segments/explore/circuit/elements/view-toggle';
import { FilterControls } from '@/ui/segments/data-table/elements/filter-controls';
import { CircuitRepresentationView } from '@/ui/segments/explore/circuit/helpers';
import { coreFiltersAtom } from '@/ui/segments/data-table/elements/context';
import { OnCellClick, WrapperTable } from '@/ui/segments/data-table/table';
import { Pagination } from '@/ui/segments/data-table/elements/pagination';
import { BrainRegionDropdown } from '@/features/brain-region-dropdown';
import { Search } from '@/ui/segments/data-table/search';
import { WorkspaceScope } from '@/constants';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { RenderButtonProps } from '@/ui/segments/data-table/elements/use-row-selection';
import type { TCircuitRepresentationView } from '@/ui/segments/explore/circuit/helpers';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TWorkspaceScope, TWorkspaceSection } from '@/constants';
import type { WorkspaceContext } from '@/types/common';
import type {
  Facets,
  Pagination as EntitycorePagination,
} from '@/api/entitycore/types/shared/response';

export type Props<T> = {
  facets: Facets | undefined;
  resultPagination?: {
    pagination: EntitycorePagination;
    totalData: number;
  };
  dataScope?: TWorkspaceScope;
  section: TWorkspaceSection;
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
  tableStyle?: CSSProperties | undefined;
  view: TCircuitRepresentationView | null;
  queryKeyHash?: string;
  expandableConfig?: ExpandableConfig<T>;
};

export function MainTable({
  dataKey,
  dataScope,
  dataType,
  workspace,
  cls,
  facets,
  renderButton,
  section,
  showLoadingState,
  isLoading,
  resultPagination,
  columns,
  dataSource,
  sticky,
  selectionType,
  onRow,
  onRowsSelected,
  onCellClick,
  tableStyle,
  view,
  queryKeyHash,
  expandableConfig,
}: Props<ICircuit>) {
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
                dataScope === WorkspaceScope.BuildSynaptomeModel) && (
                <BrainRegionDropdown dataKey={dataKey} />
              )}
              <CircuitViewToggle />
              <FilterControls
                filters={filters}
                displayControlPanel={displayControlPanel}
                setDisplayControlPanel={onDisplayControlPanel}
                className="justify-end self-end"
              />
            </div>
          </div>
        </div>
        <WrapperTable<ICircuit>
          key={view === CircuitRepresentationView.Hierarchy ? queryKeyHash : 'circuit-table'}
          dataType={dataType}
          columns={columns}
          dataSource={dataSource}
          loading={
            showLoadingState && isLoading
              ? {
                  indicator: (
                    <Spin indicator={<LoadingOutlined spin className="text-primary-6" />} />
                  ),
                  spinning: showLoadingState && isLoading,
                  size: 'large',
                }
              : false
          }
          onCellClick={onCellClick}
          renderButton={renderButton}
          selectionType={selectionType}
          onRowsSelected={onRowsSelected}
          dataKey={dataKey}
          rowClassName={(record: ICircuit) =>
            // eslint-disable-next-line no-nested-ternary
            'isFiltered' in record && record.isFiltered
              ? `filtered-in [&_td_svg]:text-primary-8!`
              : view === 'hierarchy'
                ? 'filtered-out [&_td]:bg-background! [&_td]:text-neutral-4!'
                : '[&_td_svg]:text-primary-8!'
          }
          tableStyle={tableStyle}
          onRow={onRow}
          sticky={sticky}
          className={cls?.table}
          controls={
            view === CircuitRepresentationView.Flat && (
              <div className="w-full">
                <Pagination {...{ dataKey, dataType, section, resultPagination }} />
              </div>
            )
          }
          expandableConfig={expandableConfig}
        />
      </section>
      {displayControlPanel && filters && (
        <ListingFilterPanel
          data-testid="listing-view-control-panel"
          dataScope={dataScope}
          filters={filters}
          setFilters={setFilters}
          toggleDisplay={() => onDisplayControlPanel(false)}
          dataType={dataType}
          dataKey={dataKey}
          facets={facets}
          workspace={workspace}
          section={section}
        />
      )}
    </>
  );
}

export default MainTable;
