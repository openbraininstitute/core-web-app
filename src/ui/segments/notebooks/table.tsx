'use client';

import { ConfigProvider, DatePicker, Input, Select } from 'antd';

import { useState } from 'react';

import { LoadingOutlined, UndoOutlined } from '@ant-design/icons';
import Table from 'antd/es/table';
import dynamic from 'next/dynamic';
import dateFnsGenerateConfig from 'rc-picker/lib/generate/dateFns';
// @ts-ignore
import useSearch from '@/components/VirtualLab/Search';
import { NoUndefinedRangeValueType, RangeValueType } from 'rc-picker/lib/PickerInput/RangePicker';
import ContentModal from './ContentModal';

import ColumnToggle, { useFilters } from '@/components/FilterControls/Filter';
import FilterControls from '@/components/FilterControls/FilterControls';
import { useAppNotification } from '@/components/notification';
import columns from '@/ui/segments/notebooks/table/columns';
import { useToggleColumns } from '@/ui/segments/notebooks/utils/use-toggle-column';
import { Notebook } from '@/util/virtual-lab/types';
import filteredNotebooks from './utils/filtered-notebooks';

const { RangePicker } = DatePicker.generatePicker<Date>(dateFnsGenerateConfig);
const { Option } = Select;

function NotebookTable({
  notebooks,
  failed,
  onDelete: _onDelete,
  vlabId: _vlabId,
  projectId: _projectId,
  serverError,
  enableRunNotebook: _enableRunNotebook = false,
}: {
  vlabId: string;
  projectId: string;
  notebooks: Notebook[];
  failed?: string[];
  onDelete?: (id: string) => void;
  serverError?: string;
  enableRunNotebook?: boolean;
}) {
  const notification = useAppNotification();
  const [_loadingZip, _setLoadingZip] = useState(false);
  const [currentNotebook, setCurrentNotebook] = useState<Notebook | null>(null);
  const [display, setDisplay] = useState<'notebook' | 'readme' | null>(null);

  if (serverError)
    notification.error({
      message: serverError,
      key: 'notebooks-server-error',
      placement: 'topRight',
    });

  const resetModal = () => {
    setCurrentNotebook(null);
    setDisplay(null);
  };

  if (failed && failed.length)
    notification.warning({
      message:
        "Failed to fetch some repositories, ensure they're public and contain valid metadata for each notebook",
      placement: 'topRight',
    });

  const { filteredColumns, toggleColumn, isColumnHidden } = useToggleColumns(columns);

  const { search, Search } = useSearch({
    placeholder: 'Search for notebooks',
    containerClassName: 'ml-5',
    className: 'w-[200px] placeholder:text-gray-400',
  });

  const { filteredData, onDateChange, filterCount, onChange, onFilterReset, filterValue } =
    useFilters(filteredNotebooks(notebooks, search));

  return (
    <ConfigProvider
      theme={{
        token: {
          colorBgContainer: 'transparent',
          colorBorderSecondary: 'transparent',
          colorText: '#002766',
          colorTextHeading: '#8C8C8C',
        },
      }}
    >
      <div className="m flex w-full flex-row items-center justify-between">
        {Search}
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
                value={filterValue('name') ?? ''}
                className="w-2/3 transition-none"
                onInput={(e) => {
                  onChange('name', e.currentTarget.value);
                }}
              />
            </ColumnToggle>
            <ColumnToggle
              hidden={isColumnHidden('description')}
              title="Description"
              onToggle={() => toggleColumn('description')}
            >
              <Input
                value={filterValue('description') ?? ''}
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
                value={filterValue('objectOfInterest') ?? ''}
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
                  value={filterValue('scale')}
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
                value={filterValue('authors') ?? ''}
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
      </div>

      <div id="table-container" className="mt-5 w-full">
        <Table
          dataSource={filteredData}
          columns={filteredColumns}
          pagination={false}
          locale={{ emptyText: <div className="mt-5 text-lg text-gray-400">No data</div> }}
        />
      </div>

      <ContentModal notebook={currentNotebook} display={display} onCancel={resetModal} />

      <style jsx global>{`
        /* Change color of sorting icons */
        #table-container .ant-table-column-sorter-up,
        #table-container .ant-table-column-sorter-down {
          color: #002766;
        }

        #table-container .ant-table-column-sorter-up.active,
        #table-container .ant-table-column-sorter-down.active {
          color: #002766 !important;
        }

        #table-container .ant-table-thead > tr > th {
          background-color: transparent !important; /* Matching header background color */
          font-weight: normal !important;
        }

        #popover * {
          background-color: #fff !important;
        }
      `}</style>
    </ConfigProvider>
  );
}

export default dynamic(() => Promise.resolve(NotebookTable), {
  ssr: false,
  loading: () => (
    <div className="col-span-3 flex grow items-center justify-center text-3xl text-white">
      <LoadingOutlined />
    </div>
  ),
});
