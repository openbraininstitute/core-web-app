'use client';

import { useQuery } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import Table, { type ColumnsType } from 'antd/es/table';
import { format } from 'date-fns';
import { useState } from 'react';

import { listStandalonePayments } from '@/api/virtual-lab-svc/queries/payment';
import { FileDownloadFill } from '@/components/icons';
import { HistoryError } from '@/components/VirtualLab/create-entity-flows/subscription/elements';
import { formatMinorCurrency } from '@/features/stripe/utils';
import { Button } from '@/ui/molecules/button';
import { Card, CardContent, CardTitle } from '@/ui/molecules/card';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { SubscriptionPaymentDetails } from '@/api/virtual-lab-svc/queries/types';

export function PurchasesHistory({ virtualLabId }: { virtualLabId: string }) {
  const [pagination, setPagination] = useState({ page: 1, pageSize: 5 });

  const { isLoading, data, error } = useQuery({
    queryKey: keyBuilder.purchases({
      virtualLabId,
      page: pagination.page,
      pageSize: pagination.pageSize,
    }),
    queryFn: () =>
      listStandalonePayments({
        page: pagination.page,
        pageSize: pagination.pageSize,
        virtualLabId,
      }),
  });
  const purchases = data?.data?.payments || [];

  const handlePageChange = (page: number, size: number) => {
    setPagination({ page, pageSize: size });
  };

  const columns: ColumnsType<SubscriptionPaymentDetails> = [
    {
      title: 'Credits',
      key: 'credits',
      width: 'max-content',
      render: (_, record) => {
        const credits = record.credits_purchased ?? 0;
        return <span className="font-medium">{credits.toLocaleString()}</span>;
      },
    },
    {
      title: 'Purchase date',
      key: 'payment_date',
      width: 'max-content',
      render: (_, record) => (
        <span>
          {record.payment_date ? format(new Date(record.payment_date), 'MMM dd, yyyy') : 'N/A'}
        </span>
      ),
    },
    {
      title: ' ',
      key: 'spacer',
      width: '40%',
      render: () => null,
    },
    {
      title: 'Subtotal',
      key: 'amount_subtotal',
      width: 'max-content',
      render: (_, record) => (
        <span>
          {formatMinorCurrency(
            record.amount_subtotal ?? record.amount_paid ?? record.amount_total ?? 0,
            record.currency
          )}
        </span>
      ),
    },
    {
      title: 'VAT',
      key: 'amount_tax',
      width: 'max-content',
      render: (_, record) => (
        <span>{formatMinorCurrency(record.amount_tax ?? 0, record.currency)}</span>
      ),
    },
    {
      title: 'Total',
      key: 'amount_total',
      width: 'max-content',
      render: (_, record) => (
        <span>
          {formatMinorCurrency(record.amount_total ?? record.amount_paid ?? 0, record.currency)}
        </span>
      ),
    },
    {
      title: 'Receipt',
      key: 'receipt',
      width: 'max-content',
      align: 'center',
      render: (_, record) =>
        record.receipt_url ? (
          <a href={record.receipt_url} target="_blank" rel="noopener noreferrer">
            <Button aria-label="download invoice" type="button" size="md">
              <FileDownloadFill className="text-xl text-white" />
            </Button>
          </a>
        ) : (
          <span>-</span>
        ),
    },
  ];

  if (error) return <HistoryError />;

  return (
    <div data-testid="payments-list" className="h-max w-full py-5">
      <Card className="border-primary-4 h-full w-full text-white">
        <CardContent>
          <CardTitle className="mb-5">Payment history</CardTitle>
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
                  cellPaddingBlock: 16,
                  cellPaddingInline: 16,
                },
              },
            }}
          >
            <Table
              sticky
              data-testid="payment-history"
              columns={columns}
              dataSource={purchases}
              rowKey="id"
              className="w-full"
              size="middle"
              loading={isLoading}
              rootClassName={cn(
                '[&_.ant-table-thead>tr>th]:font-light! [&_.ant-table-thead]:text-sm',
                '[&_.ant-spin-blur]:opacity-0!',
                '[&_.ant-empty-description]:text-white!',
                'me [&:has(.ant-table-empty)_td:last]:border-b-none!',
                'bg-primary-9!',
                '[&_.ant-table-cell]:bg-primary-9! [&_.ant-table-cell]:text-white!'
              )}
              rowClassName="border-b border-primary-4 last:[&_td]:border-b-0!"
              pagination={{
                current: pagination.page,
                pageSize: pagination.pageSize,
                total: data?.data?.total_count || 0,
                onChange: handlePageChange,
                showSizeChanger: false,
                hideOnSinglePage: true,
                size: 'default',
                className: cn(
                  '[&_td]:last:border',
                  '[&_.ant-pagination-item_a]:text-white! [&_.ant-pagination-item_a]:bg-primary-9! [&_.ant-pagination-item-active]:bg-primary-7 [&_.ant-pagination-item-active]:text-white! [&_.ant-pagination-item-link]:text-white!',
                  'flex items-center gap-2 [&_.ant-pagination-item]:rounded-sm [&_.ant-pagination-item_a]:rounded-sm'
                ),
              }}
            />
          </ConfigProvider>
        </CardContent>
      </Card>
    </div>
  );
}
