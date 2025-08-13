'use client';

import { HTMLProps, ReactNode, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { Spin } from 'antd';

import ExploreSectionNameSearch from '@/components/explore-section/ExploreSectionListingView/ExploreSectionNameSearch';
import SettingsIcon from '@/components/icons/Settings';

import { filterHasValue } from '@/ui/segments/data-table/elements/listing-filter-panel/util';
import { coreActiveColumnsAtom } from '@/ui/segments/data-table/elements/context';
import { classNames } from '@/util/utils';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { CoreFilter } from '@/entity-configuration/definitions/types';

function FilterBtn({ disabled, children, onClick }: HTMLProps<HTMLButtonElement>) {
  return (
    <button
      className={classNames(
        'border-neutral-2 flex items-center justify-between gap-10 rounded-md border px-2 py-2',
        disabled ? 'cursor-not-allowed bg-neutral-100' : 'bg-white'
      )}
      onClick={onClick}
      type="button"
      aria-label="listing-view-filter-button"
      disabled={!!disabled}
    >
      {children}
      <SettingsIcon className="text-primary-8 h-4 rotate-90" />
    </button>
  );
}

export function FilterControls({
  children,
  displayControlPanel,
  setDisplayControlPanel,
  dataType,
  dataKey,
  filters,
  disabled,
  className,
}: {
  children?: ReactNode;
  displayControlPanel: boolean;
  setDisplayControlPanel: (v: boolean) => void;
  dataType: TExtendedEntitiesTypeDict;
  dataKey: string;
  filters?: CoreFilter[];
  disabled?: boolean;
  className?: HTMLProps<HTMLElement>['className'];
}) {
  const [activeColumnsLength, setActiveColumnsLength] = useState<number | undefined>(undefined);

  const activeColumns = useAtomValue(
    useMemo(() => unwrap(coreActiveColumnsAtom({ dataType, key: dataKey })), [dataType, dataKey])
  );

  const selectedFiltersCount = filters
    ? filters.filter((filter) => filterHasValue(filter)).length
    : 0;

  useEffect(() => {
    if (activeColumns && activeColumns.length) {
      setActiveColumnsLength(activeColumns.length - 1);
    }
  }, [activeColumns]);

  return (
    <div
      id="data-filter-header"
      data-testid="data-filter-header"
      className={classNames(
        'grid w-full grid-cols-[max-content_1fr_max-content] items-center justify-between gap-5 py-5',
        className
      )}
    >
      <div className="w-max">{children}</div>
      <ExploreSectionNameSearch dataType={dataType} dataKey={dataKey} />
      <div className="inline-flex w-full place-content-end gap-2">
        {/* only show search input on listing views. resource id is present on detail views. */}
        <FilterBtn disabled={disabled} onClick={() => setDisplayControlPanel(!displayControlPanel)}>
          <div className="flex items-center gap-1">
            <span className="bg-primary-8 rounded-sm px-2.5 py-1 text-sm font-bold text-white">
              {selectedFiltersCount}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={classNames(
                  'text-sm leading-5 font-bold',
                  disabled ? 'text-primary-8' : 'text-primary-8'
                )}
              >
                Filters
              </span>
              <span className="text-neutral-4 text-xs leading-5 font-semibold">
                {activeColumnsLength ? (
                  <>
                    {activeColumnsLength} active{' '}
                    {activeColumnsLength === 1 ? ' column' : ' columns'}
                  </>
                ) : (
                  <Spin />
                )}
              </span>
            </div>
          </div>
        </FilterBtn>
      </div>
    </div>
  );
}
