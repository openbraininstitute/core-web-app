'use client';

import { SettingsIcon } from '@/components/icons/Settings';
import { filterHasValue } from '@/ui/segments/data-table/elements/listing-filter-panel/util';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import type { HTMLProps, ReactNode } from 'react';
import type { TCoreFilter } from '@/entity-configuration/definitions/types';

function FilterBtn({ disabled, className, children, onClick }: HTMLProps<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'border-neutral-2 flex items-center justify-between gap-10 rounded-xl border px-2 py-2',
        { 'cursor-not-allowed bg-neutral-100': disabled },
        { 'bg-white': !disabled },
        className
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
  filters,
  disabled,
  className,
}: {
  children?: ReactNode;
  displayControlPanel: boolean;
  setDisplayControlPanel: (v: boolean) => void;
  filters?: TCoreFilter[];
  disabled?: boolean;
  className?: HTMLProps<HTMLElement>['className'];
}) {
  const selectedFiltersCount = filters
    ? filters.filter((filter) => filterHasValue(filter)).length
    : 0;
  const onFilterClick = () => setDisplayControlPanel(!displayControlPanel);

  return (
    <div
      id="data-filter-header"
      data-testid="data-filter-header"
      className={classNames(
        'z-10 flex w-auto items-center justify-between gap-5 self-end',
        className
      )}
    >
      {children}
      <div className="inline-flex w-full place-content-end gap-2">
        <FilterBtn
          disabled={disabled}
          onClick={onFilterClick}
          className="hover:bg-neutral-1 group min-w-max bg-white select-none rounded-full h-12!"
        >
          <div className="flex items-center gap-1">
            <span className="bg-primary-8 rounded-full px-2.5 py-1 text-sm font-bold text-white">
              {selectedFiltersCount}
            </span>
            <div className="flex flex-col items-start">
              <span
                className={classNames(
                  'text-sm leading-5 font-bold',
                  disabled ? 'text-primary-8' : 'text-primary-8'
                )}
              >
                Filters
              </span>
            </div>
          </div>
        </FilterBtn>
      </div>
    </div>
  );
}
