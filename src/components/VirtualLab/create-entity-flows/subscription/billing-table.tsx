'use client';

import { Table, ConfigProvider, theme, Button } from 'antd';
import { format } from 'date-fns';
import type { ColumnsType } from 'antd/es/table';

import { getStatusColor } from '@/components/VirtualLab/create-entity-flows/subscription/elements';
import { SubscriptionPaymentDetails } from '@/api/virtual-lab-svc/queries/types';
import { LightFile } from '@/components/icons/EditorIcons';
import { formatCurrency } from '@/utils/format';

interface Props {
  payments: Array<
    SubscriptionPaymentDetails & {
      subscription_id: string;
    }
  >;
}

export default function BillingTable({ payments }: Props) {
  const columns: ColumnsType<SubscriptionPaymentDetails> = [
    {
      title: 'Date',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (date: string) => format(new Date(date), 'MMM dd, yyyy'),
    },
    {
      title: 'Period',
      key: 'period',
      render: (_, record) => (
        <span>
          {format(new Date(record.period_start), 'MMM dd')} -{' '}
          {format(new Date(record.period_end), 'MMM dd, yyyy')}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span className={`rounded px-2 py-1 text-base capitalize ${getStatusColor(status)}`}>
          {status}
        </span>
      ),
    },
    {
      title: 'Payment Method',
      key: 'payment_method',
      render: (_, record) => `${record.card_brand} **** ${record.card_last4}`,
    },
    {
      title: 'Amount',
      dataIndex: 'amount_paid',
      key: 'amount_paid',
      render: (amount: number, record) => formatCurrency(amount / 100, record.currency),
    },
    {
      title: 'Invoice',
      key: 'receipt',
      align: 'center',
      render: (_, record) => (
        <>
          {record.receipt_url && (
            <a href={record.receipt_url} target="_blank" rel="noopener noreferrer">
              <Button
                aria-label="download invoice"
                type="text"
                icon={<LightFile className="text-xl" />}
                size="small"
              />
            </a>
          )}
          {record.invoice_pdf && (
            <a href={record.invoice_pdf} target="_blank" rel="noopener noreferrer">
              <Button
                aria-label="download invoice"
                type="text"
                icon={<LightFile className="text-xl text-white" />}
                size="small"
              />
            </a>
          )}
        </>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        components: {
          Table: {
            colorBgContainer: '#002766',
            colorText: 'white',
            colorTextHeading: 'white', // blue-400 equivalent
            borderColor: '#002766',
            headerBg: '#002766',
            headerColor: 'white',
            headerSplitColor: 'white',
            rowHoverBg: '#0050B3',
            borderRadius: 0,
          },
        },
      }}
    >
      <Table
        columns={columns}
        dataSource={payments}
        rowKey="id"
        pagination={false}
        className="w-full"
        size="small"
      />
    </ConfigProvider>
  );
}
