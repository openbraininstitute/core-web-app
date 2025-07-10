/* eslint-disable jsx-a11y/no-static-element-interactions */

'use client';

/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */

import { DatePicker, Switch } from 'antd';
import { useAtom, useAtomValue } from 'jotai';
import moment from 'moment';
import { useCallback, useRef, useState } from 'react';
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

function SingleFilterItem({
  title,
  id,
  index,
  filterType,
  columnCustomizable,
  onFilterChange,
}: {
  title: string;
  id: string;
  index: number;
  filterType: SingleColumnContent['filterType'];
  columnCustomizable: SingleColumnContent['columnCustomizable'];
  onFilterChange: (columnId: string, filter: any) => void;
}) {
  const [columns] = useAtom(columnsAtom);
  const [, toggleColumn] = useAtom(toggleColumnAtom);
  const [filters] = useAtom(filtersAtom);
  const isColumnActive = columns.find((column) => column.id === id)?.isActive ?? false;
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const isFilterActive = filters[id] !== null && filters[id] !== undefined;

  const [localType, setLocalType] = useState<string | undefined>(filters[id]?.type);
  const [localMin, setLocalMin] = useState<number | string | undefined>(filters[id]?.min);
  const [localMax, setLocalMax] = useState<number | string | undefined>(filters[id]?.max);
  const [localValues, setLocalValues] = useState<string[]>(filters[id]?.values || []);

  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useBuildCategoryData();
  const { scales, loading: scalesLoading, error: scalesError } = useCircuitScales();
  const { species, isLoading: speciesLoading, error: speciesError } = useCircuitSpecies();

  const handleTypeChange = useCallback(
    (value: string) => {
      setLocalType(value);
      if (filterType === 'numeric') {
        const filter = {
          property: id,
          type: value,
          min: value === 'greaterThan' || value === 'between' ? localMin : undefined,
          max: value === 'lessThan' || value === 'between' ? localMax : undefined,
        };
        onFilterChange(id, filter);
      } else if (filterType === 'select' && id !== 'scale') {
        onFilterChange(id, value ? { property: id, type: value } : null);
      }
    },
    [filterType, id, localMin, localMax, onFilterChange]
  );

  const handleMinChange = useCallback(
    (value: number | string | undefined) => {
      setLocalMin(value);
      if (filterType === 'numeric' && localType) {
        const filter = {
          property: id,
          type: localType,
          min: localType === 'greaterThan' || localType === 'between' ? value : undefined,
          max: localType === 'lessThan' || localType === 'between' ? localMax : undefined,
        };
        onFilterChange(id, filter);
      } else if (filterType === 'text' || filterType === 'date' || filterType === 'boolean') {
        onFilterChange(id, value ? { property: id, min: value } : null);
      }
    },
    [filterType, id, localType, localMax, onFilterChange]
  );

  const handleMaxChange = useCallback(
    (value: number | undefined) => {
      setLocalMax(value);
      if (filterType === 'numeric' && localType) {
        const filter = {
          property: id,
          type: localType,
          min: localType === 'greaterThan' || localType === 'between' ? localMin : undefined,
          max: localType === 'lessThan' || localType === 'between' ? value : undefined,
        };
        onFilterChange(id, filter);
      }
    },
    [filterType, id, localType, localMin, onFilterChange]
  );

  const handleValuesChange = useCallback(
    (values: string[]) => {
      setLocalValues(values);
      if (filterType === 'select' && id === 'scale') {
        onFilterChange(id, values.length > 0 ? { property: id, values } : null);
      }
    },
    [filterType, id, onFilterChange]
  );

  const renderFilterControls = () => {
    if (!filterType) return null;

    if (filterType === 'text') {
      return (
        <div className="mt-4 flex flex-col gap-y-2">
          <input
            placeholder="Search..."
            value={localMin as string}
            onChange={(e) => handleMinChange(e.target.value || undefined)}
            className="text-bas mb-2 w-full overflow-hidden rounded-full px-4 py-2 font-sans focus:outline-none"
          />
        </div>
      );
    }

    if (filterType === 'numeric') {
      return (
        <div className="mt-4 flex flex-col gap-y-2">
          <select
            value={localType}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="mb-2 w-full px-4 py-2 font-sans text-base"
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
              onChange={(e) => handleMinChange(e.target.value ? Number(e.target.value) : undefined)}
              className="mb-2 w-full overflow-hidden rounded-full px-4 py-2 font-sans text-base focus:outline-none"
            />
          )}
          {(localType === 'lessThan' || localType === 'between') && (
            <input
              type="number"
              placeholder="Max..."
              value={localMax as number | undefined}
              onChange={(e) => handleMaxChange(e.target.value ? Number(e.target.value) : undefined)}
              className="mb-2 w-full overflow-hidden rounded-full px-4 py-2 font-sans text-base focus:outline-none"
            />
          )}
        </div>
      );
    }

    if (filterType === 'select') {
      const isBuildCategory = id === 'buildCategory';
      const isSpecies = id === 'specie';
      const isScale = id === 'scale';

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

      if (isScale) {
        if (loading) {
          return <div>Loading scales...</div>;
        }
        if (error) {
          return <div>Error loading scales: {error}</div>;
        }
        if (!options || options.length === 0) {
          return <div>No scales available</div>;
        }
        return (
          <div
            className="checkbox-list mt-4 flex max-h-48 flex-col gap-y-2 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {options.map((option) => {
              const inputId = `scale-checkbox-${option}`;
              return (
                <label
                  key={option}
                  htmlFor={inputId}
                  className="flex items-center gap-x-2 text-base text-white"
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    value={option}
                    checked={localValues.includes(option)}
                    onChange={(e) => {
                      const { value } = e.target;
                      handleValuesChange(
                        e.target.checked
                          ? [...localValues, value]
                          : localValues.filter((v) => v !== value)
                      );
                    }}
                    disabled={loading}
                    className="h-4 w-4"
                  />
                  <span>{option.charAt(0).toUpperCase() + option.slice(1)}</span>
                </label>
              );
            })}
          </div>
        );
      }

      return (
        <div className="mt-4 flex flex-col gap-y-2">
          <select
            value={localType}
            onChange={(e) => handleTypeChange(e.target.value)}
            disabled={loading}
            className="mb-2 w-full px-4 py-2 font-sans text-base"
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
        </div>
      );
    }

    if (filterType === 'boolean') {
      return (
        <div className="mt-4 flex flex-col gap-y-2">
          <Switch
            checked={localMin === 'true'}
            onChange={(checked) => handleMinChange(checked ? 'true' : undefined)}
          />
        </div>
      );
    }

    if (filterType === 'date') {
      return (
        <div className="mt-4 flex flex-col gap-y-2">
          <DatePicker
            value={localMin && typeof localMin === 'string' ? moment(localMin) : null}
            onChange={(date) => handleMinChange(date ? date.format('YYYY-MM-DD') : undefined)}
            className="w-full"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className={classNames('w-full', index !== 0 && 'border-primary-6 border-t pt-6')}>
      <header className="flex w-full flex-row items-center justify-between">
        <div className="flex flex-row items-center">
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
  const [, setFilter] = useAtom(setFilterAtom);
  const [pendingFilters, setPendingFilters] = useState<Record<string, any>>({});

  const handleFilterChange = useCallback((columnId: string, filter: any) => {
    setPendingFilters((prev) => ({
      ...prev,
      [columnId]: filter,
    }));
  }, []);

  const handleClose = useCallback(() => {
    const dialog = ref.current;
    if (!dialog) return;

    dialog.style.transform = 'translateX(100%)';
    setTimeout(() => {
      dialog.close();
      if (toggle) {
        toggle();
      }
    }, 500);
  }, [toggle]);

  const handleApplyAllFilters = useCallback(() => {
    Object.entries(pendingFilters).forEach(([columnId, filter]) => {
      setFilter({ columnId, filter });
    });
    handleClose();
  }, [pendingFilters, setFilter, handleClose]);

  const handleResetAllFilters = useCallback(() => {
    setPendingFilters({});
    if (handleResetFilter) {
      handleResetFilter();
    }
  }, [handleResetFilter]);

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
                      onFilterChange={handleFilterChange}
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
              onClick={handleResetAllFilters}
              type="button"
              id="reset-filter"
              aria-label="Reset all filters"
            >
              Reset all filters
            </button>
            <button
              className="border-primary-4 border border-solid px-4 py-2 text-base text-white"
              onClick={handleApplyAllFilters}
              type="button"
              aria-label="Apply all filters"
            >
              Apply all filters
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
