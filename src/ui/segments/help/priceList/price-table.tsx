'use client';

import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo } from 'react';

import type { CreditsPack } from '@/app/api/help/credits/route';
import type { SinglePrice } from '@/app/api/help/prices/route';

type PriceTableProps = {
  prices: SinglePrice[];
  creditsPacks: CreditsPack[];
};

const costUnitDictionary: Record<string, string> = {
  creditsSimulation: 'credits / simulation',
  creditsNeuron: 'credits / neuron',
  creditsBuild: 'credits / build',
  creditsHour: 'credits / hour',
  creditsNeuronSecond: 'credit / neuron / second of biological time',
};

const getCostUnitDisplay = (costUnit: string | null): string => {
  if (!costUnit) return '';
  return costUnitDictionary[costUnit] ?? costUnit;
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

const creditsPackColumns: ColumnsType<CreditsPack> = [
  {
    title: 'Credits',
    dataIndex: 'quantity',
    key: 'quantity',
    render: (value: string) => (
      <span style={{ fontWeight: 'bold', color: '#002766' }}>{value}</span>
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
    title: 'Price (CHF)',
    dataIndex: 'price',
    key: 'price',
    render: (value: number) => (
      <span style={{ color: '#002766' }}>
        <span style={{ fontWeight: 'bold' }}>{value}</span> CHF
      </span>
    ),
  },
  {
    title: 'Price/Credit (CHF)',
    dataIndex: 'pricePerCredit',
    key: 'pricePerCredit',
    render: (value: number) => (
      <span style={{ color: '#002766' }}>
        <span style={{ fontWeight: 'bold' }}>{value}</span> CHF
      </span>
    ),
  },
];

const priceColumns: ColumnsType<SinglePrice> = [
  {
    title: 'Item Name',
    dataIndex: 'itemName',
    key: 'itemName',
    render: (value: string | null) => (
      <span style={{ fontWeight: 'bold', color: '#002766' }}>{value ?? '-'}</span>
    ),
  },
  {
    title: 'Free plan',
    dataIndex: 'freePrice',
    key: 'freePrice',
    render: (value: number | null, record: SinglePrice) => {
      if (value === null) return <span style={{ color: '#002766' }}>-</span>;
      const unitDisplay = getCostUnitDisplay(record.costUnit);
      return (
        <span style={{ color: '#002766' }}>
          <span style={{ fontWeight: 'bold' }}>{value}</span> {unitDisplay ? ` ${unitDisplay}` : ''}
        </span>
      );
    },
  },
  {
    title: 'Pro plan',
    dataIndex: 'proPrice',
    key: 'proPrice',
    render: (value: number | null, record: SinglePrice) => {
      if (value === null) return <span style={{ color: '#002766' }}>-</span>;
      const unitDisplay = getCostUnitDisplay(record.costUnit);
      return (
        <span style={{ color: '#002766' }}>
          <span style={{ fontWeight: 'bold' }}>{value}</span> {unitDisplay ? ` ${unitDisplay}` : ''}
        </span>
      );
    },
  },
];

export default function PriceTable({ prices, creditsPacks }: PriceTableProps) {
  const sortedPrices = useMemo(() => {
    return [...prices].sort((a, b) => {
      // Sort by freePrice (smallest to greatest), handling null values
      const priceA = a.freePrice ?? Infinity;
      const priceB = b.freePrice ?? Infinity;
      if (priceA !== priceB) {
        return priceA - priceB;
      }
      // If prices are equal, sort by itemName alphabetically
      const nameA = (a.itemName ?? '').toLowerCase();
      const nameB = (b.itemName ?? '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [prices]);

  const pricesBySection = useMemo(() => {
    const grouped: Record<string, SinglePrice[]> = {};
    sortedPrices.forEach((price) => {
      const section = price.section || 'Other';
      if (!grouped[section]) {
        grouped[section] = [];
      }
      grouped[section].push(price);
    });
    // Sort each section by freePrice (smallest to greatest)
    Object.keys(grouped).forEach((section) => {
      grouped[section].sort((a, b) => {
        const priceA = a.freePrice ?? Infinity;
        const priceB = b.freePrice ?? Infinity;
        if (priceA !== priceB) {
          return priceA - priceB;
        }
        // If prices are equal, sort by itemName alphabetically
        const nameA = (a.itemName ?? '').toLowerCase();
        const nameB = (b.itemName ?? '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    });
    return grouped;
  }, [sortedPrices]);

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
      // Sort by discount (starting with no discount/0, then ascending)
      const discountA = a.discount ?? 0;
      const discountB = b.discount ?? 0;
      return discountA - discountB;
    });
  }, [creditsPacks]);

  return (
    <div className="flex flex-col gap-8 overflow-auto">
      {/* Credits Packs Table */}
      {creditsPacks.length > 0 && (
        <div>
          <h3 className="text-primary-8 mb-4 rounded-full bg-white/50 px-12 py-6 text-2xl font-bold">
            Credits
          </h3>
          <Table
            dataSource={sortedCreditsPacks}
            columns={creditsPackColumns}
            rowKey={(record, index) => `credits-${record.quantity}-${index}`}
            pagination={false}
            locale={{ emptyText: 'No credits packs available' }}
            style={tableStyle}
            className={tableClassName}
            components={tableComponents}
          />
        </div>
      )}

      {/* Prices Tables by Section */}
      {Object.entries(pricesBySection).map(([section, sectionPrices]) => (
        <div key={section}>
          {section !== 'Other' && (
            <h3 className="text-primary-8 mt-12 mb-4 rounded-full bg-white/50 px-12 py-6 text-2xl font-bold">
              {section}
            </h3>
          )}
          <Table
            dataSource={sectionPrices}
            columns={priceColumns}
            rowKey={(record) =>
              `${record.itemName ?? ''}-${record.freePrice ?? ''}-${record.proPrice ?? ''}-${record.costUnit ?? ''}`
            }
            pagination={false}
            locale={{ emptyText: 'No prices available' }}
            style={tableStyle}
            className={tableClassName}
            components={tableComponents}
          />
        </div>
      ))}
    </div>
  );
}
