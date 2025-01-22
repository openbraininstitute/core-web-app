'use client';

import { ConfigProvider } from 'antd';
import { ColumnType } from 'antd/es/table';
import { useMemo } from 'react';
import Table from 'antd/es/table';
import Link from 'next/link';

const repoOwner = 'Naereen';
const repoName = 'notebooks';
const fileUrl = (path: string) => `${repoOwner}/${repoName}/blob/master/${path}`;

export default function NotebookTable({ files }: { files: string[] }) {
  const data = useMemo(
    () =>
      files.map((fileName) => {
        const parts = fileName.split('/');
        const objectOfInterest = parts[0];
        const name = parts[1];

        return {
          objectOfInterest,
          name,
          fileName,
          key: fileName,
          description: '',
          author: 'OBI',
        } satisfies Notebook;
      }),
    [files]
  );

  const getSorter = (key: keyof Notebook) => {
    const sorter = (a: Notebook, b: Notebook) => {
      if (!(key in a && typeof a[key] === 'string')) return 0;
      return a[key].localeCompare(b[key]);
    };

    return sorter;
  };

  const columns: ColumnType<Notebook>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong>{text}</strong>,
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
      title: 'view',
      dataIndex: 'fileName',
      key: 'fileName',
      render: (uri: string) => (
        <Link href={`notebooks/${encodeURIComponent(fileUrl(uri))}`}>View</Link>
      ),
    },
  ];

  const theme = {
    token: {
      colorBgContainer: '#002766',
      colorBorderSecondary: 'transparent',
      colorText: '#fff',
      colorTextHeading: '#BAE7FF',
      tableSortIconColor: '#BAE7FF',
      tableSortIconHoverColor: '#ff9800',
    },
  };

  return (
    <ConfigProvider theme={theme}>
      <div id="table-container">
        <Table dataSource={data} columns={columns} pagination={false}></Table>
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
      `}</style>
    </ConfigProvider>
  );
}

interface Notebook {
  key: string;
  name: string;
  description: string;
  objectOfInterest: string;
  fileName: string;
  author: string;
}
