'use client';

import { useMemo } from 'react';

import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { SimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { CreditsPack, SinglePrice } from '@/services/sanity';

type PriceTableProps = {
  prices: SinglePrice[];
  creditsPacks: CreditsPack[];
  backgroundTitle?: string;
};

/** Uppercase muted header, matching the previous antd custom header cell. */
function PriceHeader({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontWeight: 'normal',
        fontSize: '16px',
        color: '#A5A5A5',
        textTransform: 'uppercase',
        letterSpacing: '0.025em',
      }}
    >
      {children}
    </span>
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

const creditsPackColumns: Array<SimpleColumn<CreditsPack>> = [
  {
    id: 'quantity',
    header: 'Credits',
    headerNode: <PriceHeader>Credits</PriceHeader>,
    renderCell: (record) => (
      <span style={{ fontWeight: 'bold', color: '#002766' }}>
        {formatQuantityRange(record.quantity)}
      </span>
    ),
  },
  {
    id: 'discount',
    header: 'Discount',
    headerNode: <PriceHeader>Discount</PriceHeader>,
    renderCell: (record) => {
      const value = record.discount;
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
    id: 'pricePerCredit',
    header: 'Price/Credit (CHF)',
    headerNode: <PriceHeader>Price/Credit (CHF)</PriceHeader>,
    renderCell: (record) => (
      <span style={{ color: '#002766' }}>
        CHF <span style={{ fontWeight: 'bold' }}>{formatNumber(record.pricePerCredit)}</span>
      </span>
    ),
  },
];

export default function PriceTable({
  prices,
  creditsPacks,
  backgroundTitle = 'white/50',
}: PriceTableProps) {
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
          <SimpleGrid<CreditsPack>
            columns={creditsPackColumns}
            rows={sortedCreditsPacks}
            getRowId={(record) => `credits-${record.quantity}-${record.price}-${record.discount}`}
          />
        </div>
      )}
    </div>
  );
}
