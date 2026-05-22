'use client';

import { useMemo } from 'react';

import { PortalRegionBanner } from '@/features/brain-region-hierarchy/components/region-banner';
import { EntityTypeSelector } from '@/ui/segments/data-table/elements/entity-selector';
import { FilterControls } from '@/ui/segments/data-table/elements/filter-controls';
import { Search } from '@/ui/segments/data-table/search';
import { WorkflowScopeTabs } from '@/ui/segments/workflows/elements/scope-selector';
import { cn } from '@/utils/css-class';

import type { CSSProperties, ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TCoreFilter } from '@/entity-configuration/definitions/types';
import type { EntityTypeSelectorProps } from '@/ui/segments/data-table/elements/entity-selector';

type ToolbarLeftArea = 'scope' | 'species-search';

type ToolbarGridLayout = {
  style: CSSProperties;
  hasLeftColumn: boolean;
  hasRightColumn: boolean;
};

function buildToolbarGridLayout(options: {
  showScope: boolean;
  showSpeciesSearch: boolean;
  showRight: boolean;
}): ToolbarGridLayout | null {
  const leftAreas: ToolbarLeftArea[] = [];

  if (options.showScope) {
    leftAreas.push('scope');
  }
  if (options.showSpeciesSearch) {
    leftAreas.push('species-search');
  }

  const hasLeftColumn = leftAreas.length > 0;
  const hasRightColumn = options.showRight;

  if (!hasLeftColumn && !hasRightColumn) {
    return null;
  }

  if (hasLeftColumn && hasRightColumn) {
    return {
      hasLeftColumn,
      hasRightColumn,
      style: {
        gridTemplateAreas: leftAreas.map((area) => `'${area} right'`).join(' '),
        gridTemplateColumns: 'minmax(0, 1fr) auto',
      },
    };
  }

  if (hasRightColumn) {
    return {
      hasLeftColumn,
      hasRightColumn,
      style: {
        gridTemplateAreas: "'right'",
        gridTemplateColumns: '1fr',
        justifyItems: 'end',
      },
    };
  }

  return {
    hasLeftColumn,
    hasRightColumn,
    style: {
      gridTemplateAreas: leftAreas.map((area) => `'${area}'`).join(' '),
      gridTemplateColumns: '1fr',
    },
  };
}

export type TableToolsProps = {
  dataKey: string;
  dataType: TExtendedEntitiesTypeDict;
  searchOpenOnMount?: boolean;
  showScope: boolean;
  showSpecies: boolean;
  showSearch: boolean;
  left?: ReactNode;
  showEntityType: boolean;
  entityTypeSelector?: EntityTypeSelectorProps;
  showFilter: boolean;
  filters?: TCoreFilter[];
  displayControlPanel: boolean;
  setDisplayControlPanel: (value: boolean) => void;
  filterClassNames?: {
    speciesSelector?: string;
  };
};

export function TableTools({
  dataKey,
  dataType,
  searchOpenOnMount = false,
  showScope,
  showSpecies,
  showSearch,
  left,
  showEntityType,
  entityTypeSelector,
  showFilter,
  filters,
  displayControlPanel,
  setDisplayControlPanel,
  filterClassNames,
}: TableToolsProps) {
  const showSpeciesSearchRow = showSpecies || showSearch || Boolean(left);
  const showRightColumn = showEntityType || showFilter;

  const toolbarGrid = useMemo(
    () =>
      buildToolbarGridLayout({
        showScope,
        showSpeciesSearch: showSpeciesSearchRow,
        showRight: showRightColumn,
      }),
    [showScope, showSpeciesSearchRow, showRightColumn]
  );

  if (!toolbarGrid) {
    return null;
  }

  return (
    <div
      id="data-table-tools"
      data-testid="data-table-tools"
      className="mb-5 grid w-full items-end gap-x-4 gap-y-2"
      style={toolbarGrid.style}
    >
      {showScope ? <WorkflowScopeTabs className="max-w-max [grid-area:scope]" /> : null}
      {showSpeciesSearchRow ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 [grid-area:species-search]">
          {showSpecies ? (
            <div className="shrink-0">
              <PortalRegionBanner
                dataKey={dataKey}
                className={cn('w-110', filterClassNames?.speciesSelector)}
              />
            </div>
          ) : null}
          {left ? <div className="min-w-0 grow basis-80">{left}</div> : null}
          {showSearch ? (
            <div className="min-w-0 grow basis-80">
              <Search dataType={dataType} dataKey={dataKey} openOnMount={searchOpenOnMount} />
            </div>
          ) : null}
        </div>
      ) : null}
      {showRightColumn ? (
        <div
          className="flex flex-wrap items-center justify-end gap-3 self-end [grid-area:right]"
          style={toolbarGrid.hasLeftColumn ? { gridRow: '1 / -1' } : undefined}
        >
          {showEntityType && entityTypeSelector ? (
            <EntityTypeSelector
              options={entityTypeSelector.options}
              value={entityTypeSelector.value}
              onSelect={entityTypeSelector.onSelect}
            />
          ) : null}
          {showFilter ? (
            <FilterControls
              filters={filters}
              displayControlPanel={displayControlPanel}
              setDisplayControlPanel={setDisplayControlPanel}
              className="justify-end"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
