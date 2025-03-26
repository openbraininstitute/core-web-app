'use client';

import { Table, ConfigProvider, theme, Button, Pagination } from 'antd';
import { format } from 'date-fns';
import type { ColumnsType } from 'antd/es/table';

import { CONVERSION_RATE } from '@/components/VirtualLab/create-entity-flows/subscription/standalone-credits/credit-converter';
import { SubscriptionPaymentDetails } from '@/api/virtual-lab-svc/queries/types';
import { FileDownloadFill } from '@/components/icons/EditorIcons';

interface PaymentsTableProps {
  payments: SubscriptionPaymentDetails[];
  total: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  loading?: boolean;
}

export default function PurchasesTable({
  payments,
  total,
  currentPage,
  pageSize,
  onPageChange,
  loading = false,
}: PaymentsTableProps) {
  const columns: ColumnsType<SubscriptionPaymentDetails> = [
    {
      title: 'Credits',
      key: 'credits',
      width: 'max-content',
      render: (_, record) => {
        const credits = Math.round(record.amount_paid / 100 / CONVERSION_RATE);
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
      title: 'Amount',
      key: 'amount_paid',
      width: 'max-content',
      render: (_, record) => (
        <span>
          {record.currency.toUpperCase()} {(record.amount_paid / 100).toFixed(0)}
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
            <Button
              aria-label="download invoice"
              type="text"
              icon={<FileDownloadFill className="text-xl text-white" />}
              size="small"
            />
          </a>
        ) : (
          <span>-</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col">
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
          data-testid="subscription-history"
          columns={columns}
          dataSource={payments}
          rowKey="id"
          pagination={false}
          className="w-full"
          size="middle"
          loading={loading}
          rowClassName="border-b border-[#096DD9]"
        />
        {total > pageSize && (
          <div className="mt-4 flex justify-end">
            <Pagination
              className="[&_.ant-pagination-item-active]:bg-[#0050B3] [&_.ant-pagination-item-active]:!text-white [&_.ant-pagination-item-link]:!text-white [&_.ant-pagination-item_a]:!text-white"
              current={currentPage}
              pageSize={pageSize}
              total={total}
              onChange={onPageChange}
              showSizeChanger={false}
            />
          </div>
        )}
      </ConfigProvider>
    </div>
  );
}
