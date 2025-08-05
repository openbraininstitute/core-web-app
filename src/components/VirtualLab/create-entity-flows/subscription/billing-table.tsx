'use client';

import { Table, ConfigProvider, theme, Button } from 'antd';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import type { ColumnsType } from 'antd/es/table';

import { getStatusColor } from '@/components/VirtualLab/create-entity-flows/subscription/elements';
import { SubscriptionPaymentDetails, SubscriptionType } from '@/api/virtual-lab-svc/queries/types';
import { FileDownloadFill } from '@/components/icons/EditorIcons';
import { formatCurrency } from '@/utils/format';

interface Props {
  loading: boolean;
  payments: Array<
    SubscriptionPaymentDetails & {
      subscription_id: string;
      subscription_type: SubscriptionType;
    }
  >;
}

export function BillingTable({ payments, loading }: Props) {
  const columns: ColumnsType<SubscriptionPaymentDetails> = [
    {
      title: 'Object',
      dataIndex: '',
      key: 'subscription_type',
      render: (record) => {
        if (record.subscription_type === 'PRO') {
          return <span className="font-bold text-white">Subscription Pro</span>;
        }
        if (record.subscription_type === 'PREMIUM') {
          return <span className="font-bold text-white">Subscription Premium</span>;
        }
        if (record.subscription_type === 'FREE') {
          return <span className="font-bold text-white">Subscription Free</span>;
        }
      },
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
        <span className={`rounded-sm px-2 py-1 text-base capitalize ${getStatusColor(status)}`}>
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
                icon={<FileDownloadFill className="text-xl text-white!" />}
                size="small"
              />
            </a>
          )}
          {record.invoice_pdf && (
            <a href={record.invoice_pdf} target="_blank" rel="noopener noreferrer">
              <Button
                aria-label="download invoice"
                type="text"
                icon={<FileDownloadFill className="text-xl text-white!" />}
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
            colorTextHeading: 'white',
            borderColor: '#096DD9',
            headerBg: '#002766',
            headerColor: '#BAE7FF',
            headerSplitColor: 'transparent',
            rowHoverBg: '#0050B3',
            borderRadius: 0,
          },
        },
      }}
    >
      <Table
        loading={loading}
        data-testid="subscription-history"
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

export default BillingTable;
