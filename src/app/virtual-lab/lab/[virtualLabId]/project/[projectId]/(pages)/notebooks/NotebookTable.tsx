'use client';

import { ConfigProvider, DatePicker } from 'antd';

import Table from 'antd/es/table';
import Image from 'next/image';
import { saveAs } from 'file-saver';
import { format, compareAsc } from 'date-fns';
import { Popover } from 'antd/lib';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import dateFnsGenerateConfig from 'rc-picker/lib/generate/dateFns'; // eslint-disable-line import/no-extraneous-dependencies
import { RangeValue } from 'rc-picker/lib/interface'; // eslint-disable-line import/no-extraneous-dependencies
import { getSorter } from './utils';
import ContentModal from './ContentModal';
import useSearch from '@/components/VirtualLab/Search';
import { downloadZippedNotebook, Notebook } from '@/util/virtual-lab/github';
import { basePath } from '@/config';

import FilterControls from '@/components/FilterControls/FilterControls';
import { Column } from '@/components/FilterControls/ControlPanel';
import ColumnToggle, { useFilters, useToggleColumns } from '@/components/FilterControls/Filter';
import { notification } from '@/api/notifications';

const { RangePicker } = DatePicker.generatePicker<Date>(dateFnsGenerateConfig);

function NotebookTable({ notebooks }: { notebooks: Notebook[] }) {
  const [loadingZip, setLoadingZip] = useState(false);
  const [currentNotebook, setCurrentNotebook] = useState<Notebook | null>(null);
  const [display, setDisplay] = useState<'notebook' | 'readme' | null>(null);

  const resetModal = () => {
    setCurrentNotebook(null);
    setDisplay(null);
  };

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
        'author',
        'description',
        'notebookUrl',
        'key',
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

  const renderActionColumns = (path: string, notebook: Notebook) => {
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
                <button
                  type="button"
                  onClick={() => {
                    setDisplay('notebook');
                    setCurrentNotebook(notebook);
                  }}
                >
                  Preview
                </button>
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
      render: (name: string) => <strong>{name}</strong>,
      sorter: getSorter('name'),
    },

    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      sorter: getSorter('description'),
    },

    {
      title: 'Object of interest',
      dataIndex: 'objectOfInterest',
      key: 'objectOfInterest',
      sorter: getSorter('objectOfInterest'),
    },

    {
      title: 'Author',
      dataIndex: 'author',
      key: 'author',
      sorter: getSorter('author'),
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

  const { filteredData, onDateChange, filterCount } = useFilters(filteredNotebooks);

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
      <div className="mt-10 flex items-center justify-between">
        {Search}
        <FilterControls columns={columns} filtersCount={filterCount}>
          <ColumnToggle
            hidden={isColumnHidden('name')}
            title="Name"
            onToggle={() => toggleColumn('name')}
          />
          <ColumnToggle
            hidden={isColumnHidden('description')}
            title="Description"
            onToggle={() => toggleColumn('description')}
          />
          <ColumnToggle
            hidden={isColumnHidden('objectOfInterest')}
            title="Object of interest"
            onToggle={() => toggleColumn('objectOfInterest')}
          />
          <ColumnToggle
            hidden={isColumnHidden('author')}
            title="Author"
            onToggle={() => toggleColumn('author')}
          />
          <ColumnToggle
            hidden={isColumnHidden('creationDate')}
            title="Creation date"
            onToggle={() => toggleColumn('creationDate')}
          >
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
              <RangePicker
                onChange={(values: RangeValue<Date>) => {
                  onDateChange('creationDate', values);
                }}
              />
            </ConfigProvider>
          </ColumnToggle>
        </FilterControls>
      </div>

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
