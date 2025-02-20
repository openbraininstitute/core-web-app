'use client';

import { ConfigProvider, DatePicker, Input, Select } from 'antd';

import Table from 'antd/es/table';
import Image from 'next/image';
import { saveAs } from 'file-saver';
import { format, compareAsc } from 'date-fns';
import { Popover } from 'antd/lib';
import { DeleteOutlined, LoadingOutlined, PlusOutlined, UndoOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import dateFnsGenerateConfig from 'rc-picker/lib/generate/dateFns'; // eslint-disable-line import/no-extraneous-dependencies
import { RangeValue } from 'rc-picker/lib/interface'; // eslint-disable-line import/no-extraneous-dependencies
import { getSorter } from './utils';
import ContentModal from './ContentModal';
import NotebookTabs from './NotebookTabs';
import useSearch from '@/components/VirtualLab/Search';
import { downloadZippedNotebook, Notebook } from '@/util/virtual-lab/github';
import { basePath } from '@/config';

import FilterControls from '@/components/FilterControls/FilterControls';
import { Column } from '@/components/FilterControls/ControlPanel';
import ColumnToggle, { useFilters, useToggleColumns } from '@/components/FilterControls/Filter';
import { notification } from '@/api/notifications';

const { RangePicker } = DatePicker.generatePicker<Date>(dateFnsGenerateConfig);
const { Option } = Select;

function NotebookTable({
  notebooks,
  failed,
  onDelete,
  vlabId,
  projectId,
  serverError,
}: {
  vlabId: string;
  projectId: string;
  notebooks: Notebook[];
  failed?: string[];
  onDelete?: (id: string) => void;
  serverError?: string;
}) {
  const [loadingZip, setLoadingZip] = useState(false);
  const [currentNotebook, setCurrentNotebook] = useState<Notebook | null>(null);
  const [display, setDisplay] = useState<'notebook' | 'readme' | null>(null);

  if (serverError)
    notification.error(serverError, undefined, undefined, undefined, 'notebooks-server-error');

  const resetModal = () => {
    setCurrentNotebook(null);
    setDisplay(null);
  };

  if (failed && failed.length)
    notification.warning(
      "Failed to fetch some repositories, ensure they're public and contain valid metadate for each notebook",
      undefined,
      undefined,
      undefined,
      'failed-repo-warning'
    );

  const { search, Search } = useSearch({
    placeholder: 'Search for notebooks',
    containerClassName: 'ml-5',
    className: 'w-[200px]',
  });

  type StringKeys = {
    [K in keyof Notebook]: Notebook[K] extends string ? K : never;
  }[keyof Notebook];

  const filteredNotebooks = useMemo(() => {
    if (!search) return notebooks;
    return notebooks.filter((n) => {
      const searchFields: StringKeys[] = [
        'authors',
        'description',
        'notebookUrl',
        'name',
        'objectOfInterest',
      ];

      for (const field of searchFields) {
        if (n[field].toLocaleLowerCase().includes(search.toLocaleLowerCase())) {
          return true;
        }
      }
      return false;
    });
  }, [notebooks, search]);

  const handleDownloadClick = async (notebook: Notebook) => {
    setLoadingZip(true);

    try {
      const blob = await downloadZippedNotebook(notebook);

      saveAs(blob, `${notebook.name}.zip`);
      setLoadingZip(false);
    } catch {
      notification.error('Failed to download the contents, ensure the repo is public');
    }
  };

  const renderActionColumns = (_: string, notebook: Notebook) => {
    return (
      <div id="popover">
        <Popover
          content={
            <div className="flex min-w-[120px] flex-col gap-2 text-white">
              <div className="flex gap-4">
                <Image
                  src={`${basePath}/images/icons/eye-2.svg`}
                  width={12}
                  height={12}
                  alt="View"
                />
                <button
                  type="button"
                  onClick={() => {
                    setDisplay('readme');
                    setCurrentNotebook(notebook);
                  }}
                >
                  Readme
                </button>
              </div>
              <div className="flex gap-4">
                <Image
                  src={`${basePath}/images/icons/eye.svg`}
                  width={12}
                  height={12}
                  alt="Readme"
                />
                <a
                  href={`https://nbviewer.org/github/${notebook.githubUser}/${notebook.githubRepo}/blob/${notebook.defaultBranch}/${notebook.path}`}
                  target="_blank"
                >
                  Preview
                </a>
              </div>
              <div className="flex gap-4">
                <Image
                  src={`${basePath}/images/icons/download.svg`}
                  width={12}
                  height={12}
                  alt="download"
                />
                <button
                  type="button"
                  className="hover:text-primary-4"
                  onClick={() => handleDownloadClick(notebook)}
                >
                  Download
                </button>
                {loadingZip && <LoadingOutlined />}
              </div>

              {onDelete && (
                <div className="flex gap-4 text-error">
                  <DeleteOutlined className="text-error" />
                  <button
                    type="button"
                    className="hover:text-primary-4"
                    onClick={() => onDelete(notebook.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          }
          overlayStyle={{ border: '1px solid #096DD9' }}
          color="#002766"
          trigger="click"
          placement="bottom"
          arrow={false}
        >
          <PlusOutlined className="border border-[#096DD9] p-2 text-lg" />
        </Popover>
      </div>
    );
  };

  const columns: Column<Notebook>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, notebook: Notebook) => (
        <button
          className="cursor-pointer text-left hover:text-primary-5"
          aria-label="preview"
          type="button"
          onClick={() => {
            setDisplay('notebook');
            setCurrentNotebook(notebook);
          }}
        >
          {name}
        </button>
      ),
      sorter: getSorter('name'),
    },

    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      sorter: getSorter('description'),
      render: (text) => <div className="line-clamp-2 max-w-[40em]">{text}</div>,
    },

    {
      title: 'Object of interest',
      dataIndex: 'objectOfInterest',
      key: 'objectOfInterest',
      sorter: getSorter('objectOfInterest'),
    },

    {
      title: 'Scale',
      dataIndex: 'scale',
      key: 'scale',
      sorter: getSorter('scale'),
    },

    {
      title: 'Authors',
      dataIndex: 'authors',
      key: 'authors',
      sorter: getSorter('authors'),
    },

    {
      title: 'Creation date',
      dataIndex: 'creationDate',
      key: 'creationDate',
      render: (date: string | null) => (date ? format(date, 'dd.MM.yyyy') : '-'),
      sorter: (a, b) => {
        if (a.creationDate === null && b.creationDate === null) {
          return 0;
        }
        if (a.creationDate === null) {
          return 1;
        }
        if (b.creationDate === null) {
          return -1;
        }
        return compareAsc(new Date(a.creationDate), new Date(b.creationDate));
      },
    },

    {
      dataIndex: 'notebookUrl',
      key: 'notebookUrl',
      render: renderActionColumns,
    },
  ];

  const { filteredColumns, toggleColumn, isColumnHidden } = useToggleColumns(columns);

  const { filteredData, onDateChange, filterCount, onChange, onFilterReset, filterValue } =
    useFilters(filteredNotebooks);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorBgContainer: '#002766',
          colorBorderSecondary: 'transparent',
          colorText: '#fff',
          colorTextHeading: '#BAE7FF',
        },
      }}
    >
      <>
        <NotebookTabs vlabId={vlabId} projectId={projectId} />
        <div className="mt-10 flex items-center justify-between">
          {Search}
          <FilterControls numberOfColumns={filteredColumns.length - 1} filtersCount={filterCount}>
            <ConfigProvider
              theme={{
                token: {
                  colorBgBase: '#002766',
                  colorPrimary: '#40a9ff',
                  colorTextPlaceholder: '#8c8c8c',
                  colorTextDisabled: '#8c8c8c',
                  colorIcon: '#8c8c8c',
                  colorIconHover: '#40a9ff',
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
                  value={(filterValue('creationDate') as RangeValue<Date>) ?? null}
                  onChange={(values: RangeValue<Date>) => {
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
      </>

      <div id="table-container" className="mt-5">
        <Table dataSource={filteredData} columns={filteredColumns} pagination={false} />
      </div>

      <ContentModal notebook={currentNotebook} display={display} onCancel={resetModal} />

      <style jsx global>{`
        /* Change color of sorting icons */
        #table-container .ant-table-column-sorter-up,
        #table-container .ant-table-column-sorter-down {
          color: #bae7ff;
        }

        #table-container .ant-table-column-sorter-up.active,
        #table-container .ant-table-column-sorter-down.active {
          color: #fff !important;
        }

        #table-container .ant-table-thead > tr > th {
          background-color: #002766 !important; /* Matching header background color */
          font-weight: normal !important;
        }

        #popover * {
          background-color: #002766 !important;
        }
      `}</style>
    </ConfigProvider>
  );
}

export default dynamic(() => Promise.resolve(NotebookTable), {
  ssr: false,
  loading: () => (
    <div className="flex flex-grow items-center justify-center text-3xl text-white">
      <LoadingOutlined />
    </div>
  ),
});
