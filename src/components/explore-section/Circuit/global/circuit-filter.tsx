import { Button, Input, Select } from 'antd';
import { useState } from 'react';
import { useBuildCategoryData } from '../hook/use-build-category-data';
import { NumericFilterOptions, NumericFilterProps } from '../type';

const { Option } = Select;

export default function CircuitFilters({
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

  const { categories, isLoading, error } = useBuildCategoryData();

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
      onMinChange(localMin);
      onMaxChange(localMax);
    }
  };

  const isNumericProperty =
    localProperty === 'numberOfNeurons' ||
    localProperty === 'numberOfConnections' ||
    localProperty === 'numberOfSynapses';

  return (
    <div className="flex flex-row items-center">
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
        <Option value="numberOfNeurons"># of Neurons</Option>
        <Option value="numberOfConnections"># of Connections</Option>
        <Option value="numberOfSynapses"># of Synapses</Option>
        <Option value="scaleType">Scale Type</Option>
        <Option value="scaleType">Build Category</Option>
      </Select>
      {(() => {
        if (
          localProperty === 'numberOfNeurons' ||
          localProperty === 'numberOfConnections' ||
          localProperty === 'numberOfSynapses'
        ) {
          return (
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
          );
        }
        if (localProperty === 'scaleType') {
          return (
            <Select
              className="mr-2 w-[150px]"
              placeholder="Select scale"
              value={localType}
              onChange={handleTypeChange}
              disabled={!localProperty}
            >
              <Option value="smallMicrocircuit">Small microcircuit</Option>
              <Option value="microcircuit">Microcircuit</Option>
            </Select>
          );
        }
        if (localProperty === 'buildCategory') {
          return (
            <Select
              className="mr-2 w-[150px]"
              placeholder="Select category"
              value={localType}
              onChange={handleTypeChange}
              disabled={!localProperty || isLoading}
              loading={isLoading}
            >
              {error ? (
                <Option value="" disabled>
                  Error loading categories
                </Option>
              ) : (
                categories.map((category) => (
                  <Option key={category} value={category}>
                    {category}
                  </Option>
                ))
              )}
            </Select>
          );
        }
        return null;
      })()}

      {(localType === 'greaterThan' || localType === 'between') && isNumericProperty && (
        <Input
          type="number"
          aria-label="Min value"
          placeholder="Min..."
          value={localMin}
          onChange={(e) => setLocalMin(Number(e.target.value) || undefined)}
          className="mr-2 w-24"
        />
      )}

      {(localType === 'lessThan' || localType === 'between') && isNumericProperty && (
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
