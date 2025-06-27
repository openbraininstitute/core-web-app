import { Button, Input, Select } from 'antd';
import { useState } from 'react';
import { useBuildCategoryData } from '../hook/use-build-category-data';
import { useCircuitScales } from '../hook/use-scale-type-data';
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

  // BUILD CATEGORY DATA HOOK
  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useBuildCategoryData();

  // CIRCUIT SCALES HOOK
  const { scales, loading: scalesLoading, error: scalesError } = useCircuitScales();

  const handlePropertyChange = (property: NumericFilterOptions['property']) => {
    setLocalProperty(property);
    setLocalType(undefined);
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

  const renderNumericConditionSelect = (
    property: NumericFilterOptions['property'] | undefined,
    type: NumericFilterOptions['type'] | undefined,
    onTypeChange: (type: NumericFilterOptions['type']) => void
  ) => {
    if (
      property === 'numberOfNeurons' ||
      property === 'numberOfConnections' ||
      property === 'numberOfSynapses'
    ) {
      return (
        <Select
          className="mr-2 w-[150px]"
          placeholder="Condition"
          value={type}
          onChange={onTypeChange}
          disabled={!property}
        >
          <Option value="greaterThan">Greater than</Option>
          <Option value="lessThan">Less than</Option>
          <Option value="between">Between</Option>
        </Select>
      );
    }
    return null;
  };

  const renderConditionSelect = (
    property: NumericFilterOptions['property'] | undefined,
    type: NumericFilterOptions['type'] | undefined,
    onTypeChange: (type: NumericFilterOptions['type']) => void,
    categoryList: string[],
    categoriesLoadingParam: boolean,
    categoriesErrorParam: Error | null,
    scalesList: string[],
    scalesLoadingParam: boolean,
    scalesErrorParam: string | null
  ) => {
    const numericSelect = renderNumericConditionSelect(property, type, onTypeChange);
    if (numericSelect) return numericSelect;

    if (property === 'scaleType') {
      return (
        <Select
          className="mr-2 w-[150px]"
          placeholder="Select scale"
          value={type}
          onChange={onTypeChange}
          disabled={!property || scalesLoadingParam}
          loading={scalesLoadingParam}
        >
          {scalesErrorParam ? (
            <Option value="" disabled>
              Error loading scales
            </Option>
          ) : (
            scalesList.map((scale) => (
              <Option key={scale} value={scale}>
                {scale}
              </Option>
            ))
          )}
        </Select>
      );
    }
    if (property === 'buildCategory') {
      return (
        <Select
          className="mr-2 w-[150px]"
          placeholder="Select category"
          value={type}
          onChange={onTypeChange}
          disabled={!property || categoriesLoadingParam}
          loading={categoriesLoadingParam}
        >
          {categoriesErrorParam ? (
            <Option value="" disabled>
              Error loading categories
            </Option>
          ) : (
            categoryList.map((category) => (
              <Option key={category} value={category}>
                {category}
              </Option>
            ))
          )}
        </Select>
      );
    }
    return null;
  };

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
        <Option value="scaleType">Scale</Option>
        <Option value="buildCategory">Build Category</Option>
      </Select>
      {(() => {
        let categoriesErrorParam: Error | null = null;
        if (categoriesError) {
          categoriesErrorParam =
            typeof categoriesError === 'string' ? new Error(categoriesError) : categoriesError;
        }
        return renderConditionSelect(
          localProperty,
          localType,
          handleTypeChange,
          categories,
          categoriesLoading,
          categoriesErrorParam,
          scales,
          scalesLoading,
          scalesError
        );
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
