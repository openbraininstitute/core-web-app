import { Button, Input, Select } from 'antd';
import { useState } from 'react';
import { NumericFilterOptions } from '../utils/filter-circuits-by-numeric';

const { Option } = Select;

export type NumericFilterProps = {
  filter: NumericFilterOptions | null;
  minValue: number | undefined;
  maxValue: number | undefined;
  onFilterChange: (filter: NumericFilterOptions | null) => void;
  onMinChange: (value: number | undefined) => void;
  onMaxChange: (value: number | undefined) => void;
};

export default function NumericFilters({
  filter,
  minValue,
  maxValue,
  onFilterChange,
  onMinChange,
  onMaxChange,
}: NumericFilterProps) {
  const [localProperty, setLocalProperty] = useState<NumericFilterOptions['property'] | undefined>(
    filter?.property
  );
  const [localType, setLocalType] = useState<NumericFilterOptions['type'] | undefined>(
    filter?.type
  );
  const [localMin, setLocalMin] = useState<number | undefined>(minValue);
  const [localMax, setLocalMax] = useState<number | undefined>(maxValue);

  const handlePropertyChange = (property: NumericFilterOptions['property']) => {
    setLocalProperty(property);
  };

  const handleTypeChange = (type: NumericFilterOptions['type']) => {
    setLocalType(type);
  };

  const handleResetFilter = () => {
    setLocalProperty(undefined);
    setLocalType(undefined);
    setLocalMin(undefined);
    setLocalMax(undefined);
    onFilterChange(null);
    onMinChange(undefined);
    onMaxChange(undefined);
  };

  const handleApplyFilter = () => {
    if (localProperty && localType) {
      const newFilter: NumericFilterOptions = {
        property: localProperty,
        type: localType,
        min: localMin,
        max: localMax,
      };
      onFilterChange(newFilter);
      // Sync parent state with applied values
      onMinChange(localMin);
      onMaxChange(localMax);
    }
  };

  return (
    <div className="mb-4">
      {filter && (
        <button
          className="mr-8 text-sm text-gray-500 hover:text-gray-700"
          onClick={handleResetFilter}
          type="button"
          id="reset-filter"
          aria-label="Reset filter"
        >
          Reset filter
        </button>
      )}
      <Select
        className="mr-2 w-[150px]"
        placeholder="Filter by"
        value={localProperty}
        onChange={handlePropertyChange}
      >
        <Option value="neurons"># of Neurons</Option>
        <Option value="connections"># of Connections</Option>
        <Option value="synapses"># of Synapses</Option>
      </Select>
      <Select
        className="mr-2 w-[150px]"
        placeholder="Condition"
        value={localType}
        onChange={handleTypeChange}
        disabled={!localProperty}
      >
        <Option value="greaterThan">Greater than</Option>
        <Option value="lessThan">Less than</Option>
        <Option value="between">Between</Option>
      </Select>

      {(localType === 'greaterThan' || localType === 'between') && (
        <Input
          type="number"
          aria-label="Min value"
          placeholder="Min..."
          value={localMin}
          onChange={(e) => setLocalMin(Number(e.target.value) || undefined)}
          className="mr-2 w-24"
        />
      )}

      {(localType === 'lessThan' || localType === 'between') && (
        <Input
          type="number"
          aria-label="Max value"
          placeholder="Max..."
          value={localMax}
          onChange={(e) => setLocalMax(Number(e.target.value) || undefined)}
          className="mr-2 w-24"
        />
      )}

      <Button
        type="primary"
        onClick={handleApplyFilter}
        disabled={!localProperty || !localType}
        className="ml-4"
      >
        Apply
      </Button>
    </div>
  );
}
