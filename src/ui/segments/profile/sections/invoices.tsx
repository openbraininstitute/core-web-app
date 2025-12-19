import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, ConfigProvider, theme } from 'antd';
import Table, { type ColumnsType } from 'antd/es/table';
import { format } from 'date-fns';
import flatMap from 'es-toolkit/compat/flatMap';
import { listUserSubscriptionsHistory } from '@/api/virtual-lab-svc/queries/subscription';
import type { SubscriptionPaymentDetails } from '@/api/virtual-lab-svc/queries/types';
import { FileDownloadFill } from '@/components/icons/EditorIcons';
import { getStatusColor } from '@/components/VirtualLab/create-entity-flows/subscription/elements';
import { keyBuilder } from '@/ui/use-query-keys/user';
import { cn } from '@/utils/css-class';
import { formatCurrency } from '@/utils/format';

export function Invoices() {
  const { data, isError, isLoading } = useQuery({
    queryKey: keyBuilder.invoices(),
    queryFn: listUserSubscriptionsHistory,
  });

  const allPayments = flatMap(data?.subscriptions, (subscription) =>
    subscription.payments
      .filter((payment) => !payment.is_standalone)
      .map((payment) => ({
        ...payment,
        subscription_id: subscription.id,
        subscription_type: subscription.subscription_type,
      })),
  );

  if (isError) {
    return (
      <div className={cn('my-6 flex w-full flex-col items-center justify-center gap-2')}>
        <ExclamationCircleOutlined className="text-current" />
        <div className="text-current">There is some issues loading your invoices history</div>
      </div>
    );
  }

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
    <div data-testid="payments-list" className="h-full w-full py-5">
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
          loading={isLoading}
          data-testid="invoices-history"
          rootClassName={cn(
            '[&_.ant-spin-blur]:opacity-0! [&_.ant-table-thead>tr>th]:font-light!',
            '[&_.ant-table-thead>tr>th]:font-light! [&_.ant-table-thead]:text-sm',
            '[&_.ant-empty-description]:text-white!',
            'me',
          )}
          rowClassName="border-b border-primary-4 last:[&_td]:border-b-0!"
          columns={columns}
          dataSource={allPayments}
          rowKey="id"
          pagination={false}
          className="w-full"
          size="middle"
        />
      </ConfigProvider>
    </div>
  );
}
