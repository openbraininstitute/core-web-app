import {
  Dispatch,
  HTMLProps,
  PropsWithChildren,
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
import { filterHasValue } from '@/components/Filter/util';
import { activeColumnsAtom } from '@/state/explore-section/list-view-atoms';
import { Filter } from '@/components/Filter/types';
import { DataType } from '@/constants/explore-section/list-views';
import { classNames } from '@/util/utils';
import { ExploreDataScope } from '@/types/explore-section/application';
import ControlPanel from './ControlPanel';
import { ColumnType } from 'antd/lib/table';

export type Column<T> = ColumnType<T> & {
  key: string;
  hidden: boolean;
};

export default function FilterControls<T extends { [key: string]: any }>({
  filters,
  disabled,
  className,
  columns,
  children,
}: PropsWithChildren<{
  filters?: Filter[];
  disabled?: boolean;
  className?: HTMLProps<HTMLElement>['className'];
  columns: Column<T>[];
}>) {
  const [displayControlPanel, setDisplayControlPanel] = useState(false);

  const selectedFiltersCount = filters
    ? filters.filter((filter) => filterHasValue(filter)).length
    : 0;

  return (
    <>
      <div className={classNames('flex items-center justify-between gap-5 py-5', className)}>
        <div className="inline-flex w-full place-content-end gap-2">
          <button
            className={classNames(
              'flex items-center justify-between gap-10 rounded-md border border-neutral-2 px-2 py-2',
              disabled ? 'cursor-not-allowed bg-neutral-100' : 'bg-white'
            )}
            disabled={disabled}
            type="button"
            aria-label="listing-view-filter-button"
            onClick={() => setDisplayControlPanel(!displayControlPanel)}
          >
            <div className="flex items-center gap-1">
              <span className="rounded bg-primary-8 px-2.5 py-1 text-sm font-bold text-white">
                {selectedFiltersCount}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={classNames(
                    'text-sm font-bold leading-5',
                    disabled ? 'text-primary-8' : 'text-primary-8'
                  )}
                >
                  Filters
                </span>
                <span className="text-xs font-semibold leading-5 text-neutral-4">
                  <>
                    {columns.length} active
                    {columns.length === 1 ? ' column' : ' columns'}
                  </>
                </span>
              </div>
            </div>
            <SettingsIcon className="h-4 rotate-90 text-primary-8" />
          </button>
        </div>
      </div>

      <ControlPanel
        onClose={() => setDisplayControlPanel(false)}
        columns={columns}
        visible={displayControlPanel}
      >
        {children}
      </ControlPanel>
    </>
  );
}
