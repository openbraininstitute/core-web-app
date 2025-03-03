'use client';

import { Table, ConfigProvider, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { LightFile } from '@/components/icons/EditorIcons';

type BillingRecord = {
  key: string;
  date: string;
  paymentMethod: string;
  receiptLink: string;
};

const billingData: BillingRecord[] = [
  {
    key: '1',
    date: 'March 2025',
    paymentMethod: '4435 **** **** **** 2198',
    receiptLink: '#',
  },
  {
    key: '2',
    date: 'February 2025',
    paymentMethod: '4435 **** **** **** 2198',
    receiptLink: '#',
  },
  {
    key: '3',
    date: 'January 2025',
    paymentMethod: '4435 **** **** **** 2198',
    receiptLink: '#',
  },
];

export default function BillingTable() {
  const columns: ColumnsType<BillingRecord> = [
    {
      title: 'DATE',
      dataIndex: 'date',
      key: 'date',
      render: (text) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'PAYMENT METHOD',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
    },
    {
      title: '',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <a
          href={record.receiptLink}
          className="inline-flex items-center gap-2 text-white transition-colors hover:text-blue-300"
        >
          <span>Download receipt</span>
          <LightFile className="h-5 w-5" />
        </a>
      ),
    },
  ];

  return (
    <div className="mt-8 w-full">
      <h2 className="mb-6 text-xl font-bold text-white">Billing</h2>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          components: {
            Table: {
              colorBgContainer: '#002766',
              colorText: 'white',
              colorTextHeading: '#60a5fa', // blue-400 equivalent
              borderColor: '#002766',
              headerBg: '#002766',
              headerColor: '#60a5fa', // blue-400 equivalent
              headerSplitColor: '#152761',
              rowHoverBg: '#003A8C',
            },
          },
        }}
      >
        <Table
          columns={columns}
          dataSource={billingData}
          pagination={false}
          bordered={false}
          className="billing-table"
        />
      </ConfigProvider>
    </div>
  );
}
