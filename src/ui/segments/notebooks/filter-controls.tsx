'use client';

import { UndoOutlined } from '@ant-design/icons';
import { ConfigProvider, DatePicker, Input, Select } from 'antd';
import dateFnsGenerateConfig from 'rc-picker/lib/generate/dateFns';
import { NoUndefinedRangeValueType, RangeValueType } from 'rc-picker/lib/PickerInput/RangePicker';

import ColumnToggle from '@/components/FilterControls/Filter';
import FilterControls from '@/components/FilterControls/FilterControls';

const { RangePicker } = DatePicker.generatePicker<Date>(dateFnsGenerateConfig);
const { Option } = Select;

type Props = {
  filteredColumns: any[];
  isColumnHidden: (dataIndex: string) => boolean;
  toggleColumn: (dataIndex: string) => void;
  filterCount: number;
  filterValue: (key: string) => unknown;
  onChange: (key: string, value: any) => void;
  onDateChange: (key: string, values: NoUndefinedRangeValueType<Date> | null) => void;
  onFilterReset: () => void;
};

export default function NotebookFilters({
  filteredColumns,
  isColumnHidden,
  toggleColumn,
  filterCount,
  filterValue,
  onChange,
  onDateChange,
  onFilterReset,
}: Props) {
  return (
    <FilterControls numberOfColumns={filteredColumns.length - 1} filtersCount={filterCount}>
      <ConfigProvider
        theme={{
          token: {
            colorBgBase: '#002766',
            colorPrimary: '#002766',
            colorTextPlaceholder: '#8c8c8c',
            colorTextDisabled: '#8c8c8c',
            colorIcon: '#8c8c8c',
            colorIconHover: '#002766',
          },
        }}
      >
        <ColumnToggle
          hidden={isColumnHidden('name')}
          title="Name"
          onToggle={() => toggleColumn('name')}
        >
          <Input
            value={(filterValue('name') as string) ?? ''}
            className="w-2/3 transition-none"
            onInput={(e) => {
              onChange('name', (e.currentTarget as HTMLInputElement).value);
            }}
          />
        </ColumnToggle>

        <ColumnToggle
          hidden={isColumnHidden('description')}
          title="Description"
          onToggle={() => toggleColumn('description')}
        >
          <Input
            value={(filterValue('description') as string) ?? ''}
            className="w-2/3 transition-none"
            onChange={(e) => onChange('description', e.currentTarget.value)}
          />
        </ColumnToggle>

        <ColumnToggle
          hidden={isColumnHidden('objectOfInterest')}
          title="Object of interest"
          onToggle={() => toggleColumn('objectOfInterest')}
        >
          <Input
            value={(filterValue('objectOfInterest') as string) ?? ''}
            className="w-2/3 transition-none"
            onChange={(e) => onChange('objectOfInterest', e.currentTarget.value)}
          />
        </ColumnToggle>

        <ColumnToggle
          hidden={isColumnHidden('scale')}
          title="Scale"
          onToggle={() => toggleColumn('scale')}
        >
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#002766',
              },
            }}
          >
            <Select
              placeholder="Select a scale"
              onChange={(value) => onChange('scale', value)}
              value={filterValue('scale') as string | undefined}
              style={{ width: 200 }}
            >
              <Option value="cellular">Cellular</Option>
              <Option value="metabolism">Metabolism</Option>
              <Option value="circuit">Circuit</Option>
              <Option value="system">System</Option>
            </Select>
          </ConfigProvider>
        </ColumnToggle>

        <ColumnToggle
          hidden={isColumnHidden('authors')}
          title="Author"
          onToggle={() => toggleColumn('authors')}
        >
          <Input
            value={(filterValue('authors') as string) ?? ''}
            className="w-2/3 transition-none"
            onChange={(e) => onChange('authors', e.currentTarget.value)}
          />
        </ColumnToggle>

        <ColumnToggle
          hidden={isColumnHidden('creationDate')}
          title="Creation date"
          onToggle={() => toggleColumn('creationDate')}
        >
          <RangePicker
            value={(filterValue('creationDate') as RangeValueType<Date> | null) ?? null}
            onChange={(values: NoUndefinedRangeValueType<Date> | null) => {
              onDateChange('creationDate', values);
            }}
          />
        </ColumnToggle>

        <button type="button" className="mt-5 w-fit" onClick={onFilterReset}>
          Clear filters <UndoOutlined className="ml-3 text-lg" />
        </button>
      </ConfigProvider>
    </FilterControls>
  );
}
