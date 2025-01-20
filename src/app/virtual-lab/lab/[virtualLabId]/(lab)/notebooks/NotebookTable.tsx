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
      files.map((f) => ({
        key: f,
        name: f,
      })),
    [files]
  );

  const columns: ColumnType<{ name: string }>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'view',
      dataIndex: 'key',
      render: (uri: string) => (
        <Link href={`notebooks/${encodeURIComponent(fileUrl(uri))}`}>View</Link>
      ),
    },
  ];

  const theme = {
    token: {
      colorBgContainer: '#002766', // Background color for table container
      colorBorderSecondary: 'transparent', // Border color
      colorText: '#fff', // Text color
      colorTextHeading: '#BAE7FF', // Header text color
      tableSortIconColor: '#BAE7FF', // Customize sorting icon color
      tableSortIconHoverColor: '#ff9800', // Hover color of sorting icon
    },
  };

  return (
    <ConfigProvider theme={theme}>
      <div id="table-container">
        <Table
          dataSource={data} // Data to display
          columns={columns} // Column definitions
          bordered // Adds borders to the table
          pagination={false}
        ></Table>
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
