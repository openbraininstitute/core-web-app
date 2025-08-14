'use client';

import {
  Dispatch,
  HTMLProps,
  ReactNode,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { Spin } from 'antd';

import ExploreSectionNameSearch from '@/components/explore-section/ExploreSectionListingView/ExploreSectionNameSearch';
import SettingsIcon from '@/components/icons/Settings';

import { ViewToggle } from '@/features/entities/circuit/elements/view-toggle';
import { activeColumnsAtom } from '@/state/explore-section/list-view-atoms';
import { ExploreDataScope } from '@/types/explore-section/application';
import { filterHasValue } from '@/features/listing-filter-panel/util';
import { DataType } from '@/constants/explore-section/list-views';
import { classNames } from '@/util/utils';

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

export default function FilterControls({
  children,
  displayControlPanel,
  setDisplayControlPanel,
  dataType,
  dataScope,
  dataKey,
  filters,
  resourceId,
  disabled,
  className,
}: {
  children?: ReactNode;
  displayControlPanel: boolean;
  setDisplayControlPanel: Dispatch<SetStateAction<boolean>>;
  dataType: DataType;
  dataScope?: ExploreDataScope;
  dataKey: string;
  filters?: CoreFilter[];
  resourceId?: string;
  disabled?: boolean;
  className?: HTMLProps<HTMLElement>['className'];
}) {
  const [activeColumnsLength, setActiveColumnsLength] = useState<number | undefined>(undefined);

  const activeColumns = useAtomValue(
    useMemo(
      () => unwrap(activeColumnsAtom({ dataType, dataScope, key: dataKey })),
      [dataType, dataScope, dataKey]
    )
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
      className={classNames(
        'grid w-full items-center justify-between gap-5 py-5',
        dataType === DataType.Circuit
          ? 'grid-cols-[max-content_1fr_max-content_max-content]'
          : 'grid-cols-[max-content_1fr_max-content]',
        className
      )}
    >
      <div className="w-max">{children}</div>
      {!resourceId && <ExploreSectionNameSearch dataType={dataType} dataKey={dataKey} />}
      {dataType === DataType.Circuit && (
        <div className="text-red-500">
          <ViewToggle />
        </div>
      )}
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
