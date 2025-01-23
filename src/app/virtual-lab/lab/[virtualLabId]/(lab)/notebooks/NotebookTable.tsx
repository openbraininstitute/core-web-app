'use client';

import { ConfigProvider } from 'antd';
import { ColumnType } from 'antd/es/table';
import { basePath } from '@/config';
import Table from 'antd/es/table';
import Link from 'next/link';
import { Notebook } from '@/util/virtual-lab/github';
import { format, compareAsc } from 'date-fns';
import { Popover } from 'antd/lib';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import Search from '@/components/VirtualLab/Search';
import { getSorter, fileUrl } from './utils';

function NotebookTable({ notebooks }: { notebooks: Notebook[] }) {
  const [loadingZip, setLoadingZip] = useState(false);
  const [search, setSearch] = useState('');

  type StringKeys = {
    [K in keyof Notebook]: Notebook[K] extends string ? K : never;
  }[keyof Notebook];

  const filteredNotebooks = useMemo(() => {
    if (!search) return notebooks;
    return notebooks.filter((n) => {
      const searchFields: StringKeys[] = [
        'author',
        'description',
        'fileName',
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

  const columns: ColumnType<Notebook>[] = [
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
      render: (date: string | null) => (!!date ? format(date, 'dd.MM.yyyy') : '-'),
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
      dataIndex: 'fileName',
      key: 'fileName',
      render: (uri: string) => {
        const directory = uri.slice(0, uri.lastIndexOf('/'));
        const notebookName = directory.split('/').pop();

        return (
          <div id="popover">
            <Popover
              content={
                <div className="flex min-w-[120px] flex-col gap-2 text-white">
                  <div className="flex gap-4">
                    <img src={`${basePath}/images/icons/eye.svg`} width={12} />
                    <Link href={`notebooks/${fileUrl(uri)}`}>View</Link>
                  </div>
                  <div className="flex gap-4">
                    <img src={`${basePath}/images/icons/download.svg`} width={12} />
                    <button
                      className="hover:text-primary-4"
                      onClick={async () => {
                        if (loadingZip) return;
                        setLoadingZip(true);
                        const res = await fetch(
                          `/api/downloadNotebook?folder=${encodeURIComponent(directory)}`
                        );

                        setLoadingZip(false);
                        if (!res.ok) {
                          throw new Error('Failed to fetch the zip file');
                        }

                        const blob = await res.blob();

                        // Create a temporary link element to trigger the download
                        const link = document.createElement('a');
                        const downloadUrl = window.URL.createObjectURL(blob);
                        link.href = downloadUrl;
                        link.download = `${notebookName}.zip`;
                        document.body.appendChild(link);
                        link.click(); // Trigger the download
                        document.body.removeChild(link); // Clean up the DOM

                        window.URL.revokeObjectURL(downloadUrl);
                      }}
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
      },
    },
  ];

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
      <Search
        placeholder="Search for notebooks"
        containerClassName="ml-5 mt-10"
        className="w-[200px]"
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
      />
      <div id="table-container" className="mt-5">
        <Table dataSource={filteredNotebooks} columns={columns} pagination={false}></Table>
      </div>

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
