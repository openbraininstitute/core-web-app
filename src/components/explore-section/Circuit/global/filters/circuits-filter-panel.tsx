'use client';

import { Button, DatePicker, Input, Select, Switch } from 'antd';
import { useAtom, useAtomValue } from 'jotai';
import moment from 'moment';
import { useState } from 'react';
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
import { classNames } from '@/util/utils';

const { Option } = Select;

export function SingleFilterItem({
  title,
  id,
  index,
  filterType,
}: {
  title: string;
  id: string;
  index: number;
  filterType: SingleColumnContent['filterType'];
}) {
  const [columns] = useAtom(columnsAtom);
  const [, toggleColumn] = useAtom(toggleColumnAtom);
  const [filters] = useAtom(filtersAtom);
  const [, setFilter] = useAtom(setFilterAtom);
  const isColumnActive = columns.find((column) => column.id === id)?.isActive ?? false;
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const isFilterActive = filters[id] !== null && filters[id] !== undefined;

  // Local filter state
  const [localType, setLocalType] = useState<string | undefined>(filters[id]?.type);
  const [localMin, setLocalMin] = useState<number | string | undefined>(filters[id]?.min);
  const [localMax, setLocalMax] = useState<number | string | undefined>(filters[id]?.max);

  // Hooks for select filters
  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useBuildCategoryData();
  const { scales, loading: scalesLoading, error: scalesError } = useCircuitScales();
  const { species, isLoading: speciesLoading, error: speciesError } = useCircuitSpecies();

  const handleApplyFilter = () => {
    if (filterType === 'text' || filterType === 'date' || filterType === 'boolean') {
      setFilter({ columnId: id, filter: localMin ? { property: id, min: localMin } : null });
    } else if (filterType === 'numeric' && localType) {
      setFilter({
        columnId: id,
        filter: { property: id, type: localType, min: localMin, max: localMax },
      });
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
      return (
        <div className="mt-4 flex flex-col gap-y-2">
          <Input
            placeholder="Search..."
            value={localMin as string}
            onChange={(e) => setLocalMin(e.target.value || undefined)}
            className="w-full"
          />
          <div className="flex gap-x-2">
            <Button type="primary" onClick={handleApplyFilter} disabled={!localMin}>
              Apply
            </Button>
            <Button onClick={handleResetFilter}>Reset</Button>
          </div>
        </div>
      );
    }

    if (filterType === 'numeric') {
      return (
        <div className="mt-4 flex flex-col gap-y-2">
          <Select
            placeholder="Condition"
            value={localType}
            onChange={setLocalType}
            className="w-full"
          >
            <Option value="greaterThan">Greater than</Option>
            <Option value="lessThan">Less than</Option>
            <Option value="between">Between</Option>
          </Select>
          {(localType === 'greaterThan' || localType === 'between') && (
            <Input
              type="number"
              placeholder="Min..."
              value={localMin as number | undefined}
              onChange={(e) => setLocalMin(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full"
            />
          )}
          {(localType === 'lessThan' || localType === 'between') && (
            <Input
              type="number"
              placeholder="Max..."
              value={localMax as number | undefined}
              onChange={(e) => setLocalMax(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full"
            />
          )}
          <div className="flex gap-x-2">
            <Button type="primary" onClick={handleApplyFilter} disabled={!localType}>
              Apply
            </Button>
            <Button onClick={handleResetFilter}>Reset</Button>
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
          <Select
            placeholder={selectPlaceholder}
            value={localType}
            onChange={setLocalType}
            disabled={loading}
            loading={loading}
            className="w-full"
          >
            {error ? (
              <Option value="" disabled>
                Error loading {errorLabel}
              </Option>
            ) : (
              options.map((option) => (
                <Option key={option} value={option}>
                  {option}
                </Option>
              ))
            )}
          </Select>
          <div className="flex gap-x-2">
            <Button type="primary" onClick={handleApplyFilter} disabled={!localType}>
              Apply
            </Button>
            <Button onClick={handleResetFilter}>Reset</Button>
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
            <Button type="primary" onClick={handleApplyFilter} disabled={!localMin}>
              Apply
            </Button>
            <Button onClick={handleResetFilter}>Reset</Button>
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
            <Button type="primary" onClick={handleApplyFilter} disabled={!localMin}>
              Apply
            </Button>
            <Button onClick={handleResetFilter}>Reset</Button>
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
          {filterType !== null && (
            <button
              type="button"
              onClick={() => toggleColumn(id)}
              className="flex h-8 w-8 items-center justify-between text-white"
            >
              <EyeIcon
                className={classNames('h-5 w-5', isColumnActive ? 'opacity-100' : 'opacity-60')}
              />
            </button>
          )}
          <div className="flex items-center gap-x-2">
            <div className="text-xl font-semibold whitespace-nowrap text-white">{title}</div>
            {isFilterActive && (
              <div className="text-primary-1 text-sm font-normal">Filter active</div>
            )}
          </div>
        </div>
        {filterType !== null && (
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
        )}
      </header>
      {isOpen && renderFilterControls()}
    </div>
  );
}

export default function CircuitsFilterPanel({
  isActive = true,
  toggle,
}: {
  isActive?: boolean;
  toggle?: () => void;
}) {
  const columns = useAtomValue(columnsAtom);
  const totalColumns = useAtomValue(activeColumnsCountAtom);

  return (
    <div
      className={classNames(
        'bg-primary-8 transition-right fixed top-0 z-100 flex h-screen w-[480px] shrink-0 flex-col space-y-4 overflow-y-auto p-8 duration-500 ease-in-out',
        isActive ? 'right-[40px]' : 'right-[-480px]'
      )}
    >
      <header className="mb-8 flex w-full flex-row items-center justify-between">
        <div className="flex flex-row items-baseline">
          <div className="mr-2 text-2xl font-bold text-white">Filters</div>
          <div className="text-primary-1 text-lg font-normal">{totalColumns} active columns</div>
        </div>
        <div>
          <button
            type="button"
            onClick={toggle}
            className="flex h-4 w-4 items-center justify-center text-white"
            aria-label="Close filters panel"
          >
            <CloseIcon iconColor="white" />
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-y-4">
        {columns.map((column: SingleColumnContent, index: number) => (
          <SingleFilterItem
            id={column.id}
            key={column.id}
            title={column.title}
            index={index}
            filterType={column.filterType}
          />
        ))}
      </div>
    </div>
  );
}
