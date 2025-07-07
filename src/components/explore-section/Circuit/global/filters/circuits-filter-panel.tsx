'use client';

/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */

import { DatePicker, Switch, Tooltip } from 'antd';
import { useAtom, useAtomValue } from 'jotai';
import moment from 'moment';
import { useEffect, useRef, useState } from 'react';
import { useBuildCategoryData } from '../../hook/use-build-category-data';
import { useCircuitSpecies } from '../../hook/use-circuit-species';
import { useCircuitScales } from '../../hook/use-scale-type-data';
import {
  activeColumnsCountAtom,
  columnsAtom,
  filtersAtom,
  setFilterAtom,
  SingleColumnContent,
  toggleColumnAtom,
} from '../state/columns';

import { ChevronRight, CloseIcon, EyeIcon } from '@/components/icons';
import EyeSlashIcon from '@/components/icons/EyeSlashIcon';
import { classNames } from '@/util/utils';

import styles from './circuits-filter-panel.module.css';

export function ApplyButton({ isDisabled, onClick }: { isDisabled: boolean; onClick: () => void }) {
  return isDisabled ? (
    <Tooltip title="Please fill in the required fields to apply the filter">
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        className="flex h-10 w-20 items-center justify-center text-base font-normal text-white opacity-50"
        aria-label="Apply filter"
      >
        Apply
      </button>
    </Tooltip>
  ) : (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className="border-primary-4 flex h-10 w-20 items-center justify-center border border-solid text-base font-normal text-white opacity-100"
      aria-label="Apply filter"
    >
      Apply
    </button>
  );
}

export function SingleFilterItem({
  title,
  id,
  index,
  filterType,
  columnCustomizable,
}: {
  title: string;
  id: string;
  index: number;
  filterType: SingleColumnContent['filterType'];
  columnCustomizable: SingleColumnContent['columnCustomizable'];
}) {
  const [columns] = useAtom(columnsAtom);
  const [, toggleColumn] = useAtom(toggleColumnAtom);
  const [filters] = useAtom(filtersAtom);
  const [, setFilter] = useAtom(setFilterAtom);
  const isColumnActive = columns.find((column) => column.id === id)?.isActive ?? false;
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const isFilterActive = filters[id] !== null && filters[id] !== undefined;

  const [localType, setLocalType] = useState<string | undefined>(filters[id]?.type);
  const [localMin, setLocalMin] = useState<number | string | undefined>(filters[id]?.min);
  const [localMax, setLocalMax] = useState<number | string | undefined>(filters[id]?.max);

  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useBuildCategoryData();
  const { scales, loading: scalesLoading, error: scalesError } = useCircuitScales();
  const { species, isLoading: speciesLoading, error: speciesError } = useCircuitSpecies();

  const handleApplyFilter = () => {
    if (filterType === 'numeric' && localType) {
      const filter = {
        property: id,
        type: localType,
        min: localType === 'greaterThan' || localType === 'between' ? localMin : undefined,
        max: localType === 'lessThan' || localType === 'between' ? localMax : undefined,
      };
      setFilter({ columnId: id, filter });
    } else if (filterType === 'text' || filterType === 'date' || filterType === 'boolean') {
      setFilter({ columnId: id, filter: localMin ? { property: id, min: localMin } : null });
    } else if (filterType === 'select' && localType) {
      setFilter({ columnId: id, filter: { property: id, type: localType } });
    }
  };

  const handleResetFilter = () => {
    setLocalType(undefined);
    setLocalMin(undefined);
    setLocalMax(undefined);
    setFilter({ columnId: id, filter: null });
  };

  const renderFilterControls = () => {
    if (!filterType) return null;

    if (filterType === 'text') {
      const isApplyDisabled = !localMin;
      return (
        <div className="mt-4 flex flex-col gap-y-2">
          <input
            placeholder="Search..."
            value={localMin as string}
            onChange={(e) => setLocalMin(e.target.value || undefined)}
            className="text-bas mb-2 w-full overflow-hidden rounded-full px-6 py-2 font-sans focus:outline-none"
          />
          <div className="flex gap-x-2">
            <ApplyButton isDisabled={isApplyDisabled} onClick={handleApplyFilter} />
            <button
              onClick={handleResetFilter}
              type="button"
              aria-label="Reset filter"
              className="text-primary-3 text-base font-normal"
            >
              Reset
            </button>
          </div>
        </div>
      );
    }

    if (filterType === 'numeric') {
      return (
        <div className="mt-4 flex flex-col gap-y-2">
          <select
            value={localType}
            onChange={(e) => setLocalType(e.target.value)}
            className="mb-2 w-full px-6 py-2 font-sans text-base"
          >
            <option value="" disabled selected>
              Condition
            </option>
            <option value="greaterThan">Greater than</option>
            <option value="lessThan">Less than</option>
            <option value="between">Between</option>
          </select>
          {(localType === 'greaterThan' || localType === 'between') && (
            <input
              type="number"
              placeholder="Min..."
              value={localMin as number | undefined}
              onChange={(e) => setLocalMin(e.target.value ? Number(e.target.value) : undefined)}
              className="mb-2 w-full overflow-hidden rounded-full px-6 py-2 font-sans text-base focus:outline-none"
            />
          )}
          {(localType === 'lessThan' || localType === 'between') && (
            <input
              type="number"
              placeholder="Max..."
              value={localMax as number | undefined}
              onChange={(e) => setLocalMax(e.target.value ? Number(e.target.value) : undefined)}
              className="mb-2 w-full overflow-hidden rounded-full px-6 py-2 font-sans text-base focus:outline-none"
            />
          )}
          <div className="flex gap-x-2">
            <ApplyButton
              isDisabled={!localType || (localType === 'between' && (!localMin || !localMax))}
              onClick={handleApplyFilter}
            />
            <button
              type="button"
              onClick={handleResetFilter}
              className="text-primary-3 text-base font-normal"
            >
              Reset
            </button>
          </div>
        </div>
      );
    }

    if (filterType === 'select') {
      const isBuildCategory = id === 'buildCategory';
      const isSpecies = id === 'specie';

      // OPTIONS
      let options;
      if (isBuildCategory) {
        options = categories;
      } else if (isSpecies) {
        options = species;
      } else {
        options = scales;
      }
      // LOADING
      let loading;
      if (isBuildCategory) {
        loading = categoriesLoading;
      } else if (isSpecies) {
        loading = speciesLoading;
      } else {
        loading = scalesLoading;
      }
      let error;

      // ERROR
      if (isBuildCategory) {
        error = categoriesError;
      } else if (isSpecies) {
        error = speciesError;
      } else {
        error = scalesError;
      }

      let errorLabel = 'scales';
      if (isBuildCategory) {
        errorLabel = 'categories';
      } else if (isSpecies) {
        errorLabel = 'species';
      }

      let selectPlaceholder = 'Select scale';
      if (isBuildCategory) {
        selectPlaceholder = 'Select category';
      } else if (isSpecies) {
        selectPlaceholder = 'Select species';
      }

      return (
        <div className="mt-4 flex flex-col gap-y-2">
          <select
            value={localType}
            onChange={(e) => setLocalType(e.target.value)}
            disabled={loading}
            className="mb-2 w-full px-6 py-2 font-sans text-base"
          >
            <option value="" disabled>
              {loading ? `Loading ${errorLabel}...` : selectPlaceholder}
            </option>
            {error ? (
              <option value="" disabled>
                Error loading {errorLabel}
              </option>
            ) : (
              options.map((option) => (
                <option key={option} value={option} className="capitalize">
                  {option}
                </option>
              ))
            )}
          </select>
          <div className="flex gap-x-2">
            <ApplyButton
              isDisabled={!localType || (localType === 'between' && (!localMin || !localMax))}
              onClick={handleApplyFilter}
            />
            <button
              onClick={handleResetFilter}
              type="button"
              className="text-primary-3 text-base font-normal"
            >
              Reset
            </button>
          </div>
        </div>
      );
    }

    if (filterType === 'boolean') {
      return (
        <div className="mt-4 flex flex-col gap-y-2">
          <Switch
            checked={localMin === 'true'}
            onChange={(checked) => setLocalMin(checked ? 'true' : undefined)}
          />
          <div className="flex gap-x-2">
            <ApplyButton isDisabled={!localMin} onClick={handleApplyFilter} />
            <button
              type="button"
              onClick={handleResetFilter}
              className="text-primary-3 text-base font-normal"
            >
              Reset
            </button>
          </div>
        </div>
      );
    }

    if (filterType === 'date') {
      return (
        <div className="mt-4 flex flex-col gap-y-2">
          <DatePicker
            value={localMin && typeof localMin === 'string' ? moment(localMin) : null}
            onChange={(date) => setLocalMin(date ? date.format('YYYY-MM-DD') : undefined)}
            className="w-full"
          />
          <div className="flex gap-x-2">
            <ApplyButton isDisabled={!localMin} onClick={handleApplyFilter} />
            <button
              type="button"
              onClick={handleResetFilter}
              aria-label="Reset filter"
              className="text-primary-3 text-base font-normal"
            >
              Reset
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={classNames('w-full', index !== 0 && 'border-primary-6 border-t pt-6')}>
      <header className="flex w-full flex-row items-center justify-between">
        <div className="flex flex-row items-center">
          <Tooltip title={`Toggle column visibility for ${title}`}>
            <button
              type="button"
              onClick={() => toggleColumn(id)}
              className={classNames(
                'flex h-8 w-8 items-center justify-between text-white',
                columnCustomizable ? 'pointer-events-auto' : 'pointer-events-none hidden'
              )}
              disabled={!columnCustomizable}
            >
              {isColumnActive ? (
                <EyeIcon className="h-5 w-5" />
              ) : (
                <EyeSlashIcon className="h-5 w-5 opacity-70" />
              )}
            </button>
          </Tooltip>

          <div className="flex flex-row items-baseline gap-x-2">
            <button
              type="button"
              aria-label="Open filter options"
              onClick={() => setIsOpen(!isOpen)}
              className="text-xl font-semibold whitespace-nowrap text-white"
            >
              {title}
            </button>
          </div>
        </div>
        {filterType !== null && (
          <div className="relative flex flex-row items-center gap-x-4">
            {isFilterActive && (
              <div className="text-primary-1 relative -top-px text-base font-normal">
                Filter active
              </div>
            )}
            <button
              type="button"
              aria-label="Open filter options"
              onClick={() => setIsOpen(!isOpen)}
              className="h-6 w-6"
            >
              <ChevronRight
                className="h-4 w-auto transition-transform duration-300 ease-in-out"
                style={{
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
                fill="white"
              />
            </button>
          </div>
        )}
      </header>
      {isOpen && renderFilterControls()}
    </div>
  );
}

export default function CircuitsFilterPanel({
  isActive = true,
  toggle,
  handleResetFilter,
  isFilterActive,
  numberOfActiveFilters,
}: {
  isActive?: boolean;
  toggle?: () => void;
  handleResetFilter?: () => void;
  isFilterActive?: boolean;
  numberOfActiveFilters?: number;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const columns = useAtomValue(columnsAtom);
  const totalColumns = useAtomValue(activeColumnsCountAtom);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (isActive) {
      dialog.showModal();
      dialog.style.transform = 'translateX(0)';
    }
  }, [isActive]);

  const handleClose = () => {
    const dialog = ref.current;
    if (!dialog) return;

    dialog.style.transform = 'translateX(100%)';
    setTimeout(() => {
      dialog.close();
      if (toggle) {
        toggle();
      }
    }, 500);
  };

  return (
    <dialog ref={ref} className={styles.filterPanel} onClick={handleClose}>
      <div
        role="alertdialog"
        onClick={(evt) => evt.stopPropagation()}
        className={classNames(
          styles.filterBox,
          isActive ? styles.isFilterOpen : styles.isFilterClosed
        )}
      >
        <div className="flex h-full w-full flex-col justify-between space-y-4 overflow-y-auto">
          <div>
            <header className="mb-8 flex w-full flex-row items-center justify-between">
              <div className="flex flex-row items-baseline">
                <div className="mr-2 text-2xl font-bold text-white">Filters</div>
                <div className="text-primary-1 text-lg font-normal">
                  {totalColumns} active columns
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-4 w-4 items-center justify-center text-white"
                  aria-label="Close filters panel"
                >
                  <CloseIcon iconColor="white" />
                </button>
              </div>
            </header>

            <div className="flex flex-col gap-y-3">
              {columns.map((column: SingleColumnContent, index: number) => {
                return (
                  !!column.columnCustomizable && (
                    <SingleFilterItem
                      id={column.id}
                      key={column.id}
                      title={column.title}
                      index={index}
                      filterType={column.filterType}
                      columnCustomizable={column.columnCustomizable}
                    />
                  )
                );
              })}
            </div>
          </div>

          <footer className="flex w-full flex-row items-center gap-x-2">
            <button
              className={classNames(
                'border-primary-4 mr-3 border border-solid px-4 py-2 text-base text-white',
                isFilterActive ? 'opacity-100' : 'pointer-events-none opacity-70'
              )}
              onClick={handleResetFilter}
              type="button"
              id="reset-filter"
              aria-label="Reset filter"
            >
              Reset filter
            </button>
            {!isFilterActive ? (
              <div className="text-base font-normal text-white">No filter active</div>
            ) : (
              <div className="text-base font-normal text-white">
                {numberOfActiveFilters} filter{numberOfActiveFilters !== 1 ? 's' : ''} active
              </div>
            )}
          </footer>
        </div>
      </div>
    </dialog>
  );
}
