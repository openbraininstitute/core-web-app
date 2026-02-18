'use client';

import { Table } from 'antd';
import { useMemo } from 'react';

import { cn } from '@/utils/css-class';

import type { ColumnsType } from 'antd/es/table';
import type { CSSProperties, ReactNode } from 'react';
import type { CreditsPack, SinglePrice } from '@/services/sanity';

type PriceTableProps = {
  prices: SinglePrice[];
  creditsPacks: CreditsPack[];
  backgroundTitle?: string;
};

function CustomHeaderCell({
  children,
  style,
  ...props
}: {
  children: ReactNode;
  style?: CSSProperties;
  [key: string]: unknown;
}) {
  return (
    <th
      {...props} /* eslint-disable-line react/jsx-props-no-spreading */
      style={{
        ...style,
        fontWeight: 'normal',
        fontSize: '16px',
        color: '#A5A5A5',
        backgroundColor: 'transparent',
        textTransform: 'uppercase',
        letterSpacing: '0.025em',
      }}
    >
      {children}
    </th>
  );
}

const formatNumber = (value: number | string): string => {
  const num = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString('en-US');
};

const formatQuantityRange = (value: string): string => {
  // Check if value ends with "+" and preserve it
  const trimmedValue = value.trim();
  const hasPlus = trimmedValue.endsWith('+');
  const valueWithoutPlus = hasPlus ? trimmedValue.slice(0, -1).trim() : trimmedValue;

  // Handle range values (e.g., "500-999" or "500-999+")
  if (valueWithoutPlus.includes('-')) {
    const parts = valueWithoutPlus.split('-').map((part) => part.trim());
    if (parts.length === 2) {
      const start = Number.parseFloat(parts[0]);
      const end = Number.parseFloat(parts[1]);

      const formattedStart =
        !Number.isNaN(start) && start > 999 ? start.toLocaleString('en-US') : parts[0];
      const formattedEnd = !Number.isNaN(end) && end > 999 ? end.toLocaleString('en-US') : parts[1];

      return `${formattedStart}-${formattedEnd}${hasPlus ? '+' : ''}`;
    }
  }

  // Handle single values (e.g., "50000" or "50000+")
  const num = Number.parseFloat(valueWithoutPlus);
  if (!Number.isNaN(num)) {
    if (num > 999) {
      return `${num.toLocaleString('en-US')}${hasPlus ? '+' : ''}`;
    }
    // Even if <= 999, preserve the "+" if it was there
    return `${num}${hasPlus ? '+' : ''}`;
  }

  // If not a valid number, return original value (preserving "+")
  return value;
};

const creditsPackColumns: ColumnsType<CreditsPack> = [
  {
    title: 'Credits',
    dataIndex: 'quantity',
    key: 'quantity',
    render: (value: string) => (
      <span style={{ fontWeight: 'bold', color: '#002766' }}>{formatQuantityRange(value)}</span>
    ),
  },
  {
    title: 'Discount',
    dataIndex: 'discount',
    key: 'discount',
    render: (value: number) => {
      if (!value || value === 0) {
        return <span style={{ color: '#002766' }}>—</span>;
      }
      return (
        <span style={{ color: '#002766' }}>
          <span style={{ fontWeight: 'normal' }}>Save </span>
          <span style={{ fontWeight: 'bold' }}>{value}</span>%
        </span>
      );
    },
  },
  {
    title: 'Price/Credit (CHF)',
    dataIndex: 'pricePerCredit',
    key: 'pricePerCredit',
    render: (value: number) => (
      <span style={{ color: '#002766' }}>
        CHF <span style={{ fontWeight: 'bold' }}>{formatNumber(value)}</span>
      </span>
    ),
  },
];

export default function PriceTable({
  prices,
  creditsPacks,
  backgroundTitle = 'white/50',
}: PriceTableProps) {
  const tableClassName =
    '[&_.ant-table]:bg-transparent [&_.ant-table-cell]:bg-transparent [&_.ant-table-cell]:text-[18px] [&_.ant-table-cell]:text-[#002766] [&_.ant-table-tbody>tr]:bg-transparent [&_.ant-table-tbody>tr>td]:bg-transparent [&_.ant-table-tbody>tr>td]:text-[18px] [&_.ant-table-thead>tr]:bg-transparent [&_.ant-table-thead>tr>th]:bg-transparent [&_.ant-table-thead>tr>th]:text-[16px] [&_.ant-table-thead>tr>th]:font-normal [&_.ant-table-thead>tr>th]:tracking-[0.025em] [&_.ant-table-thead>tr>th]:text-[#A5A5A5] [&_.ant-table-thead>tr>th]:uppercase';

  const tableStyle = {
    fontSize: '16px',
    color: '#002766',
    backgroundColor: 'transparent',
  } as const;
  const tableComponents = {
    header: {
      cell: CustomHeaderCell,
    },
  };

  const sortedCreditsPacks = useMemo(() => {
    return [...creditsPacks].sort((a, b) => {
      const discountA = a.discount ?? 0;
      const discountB = b.discount ?? 0;
      return discountA - discountB;
    });
  }, [creditsPacks]);

  return (
    <div className="flex flex-col gap-8 overflow-auto">
      {creditsPacks.length > 0 && (
        <div>
          <h3
            className={cn(
              'text-primary-8 mb-4 rounded-full px-12 py-6 text-3xl! font-bold',
              backgroundTitle
            )}
          >
            Credits
          </h3>
          <Table
            dataSource={sortedCreditsPacks}
            columns={creditsPackColumns}
            rowKey={(record) => `credits-${record.quantity}-${record.price}-${record.discount}`}
            pagination={false}
            locale={{ emptyText: 'No credits packs available' }}
            style={tableStyle}
            className={tableClassName}
            components={tableComponents}
          />
        </div>
      )}
    </div>
  );
}
