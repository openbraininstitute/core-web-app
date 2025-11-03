'use client';

import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo } from 'react';

import type { SinglePrice } from '@/app/api/help/prices/route';

interface PriceTableProps {
  prices: SinglePrice[];
}

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

const columns: ColumnsType<SinglePrice> = [
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

export default function PriceTable({ prices }: PriceTableProps) {
  const sortedPrices = useMemo(() => {
    return [...prices].sort((a, b) => {
      const nameA = (a.itemName ?? '').toLowerCase();
      const nameB = (b.itemName ?? '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [prices]);

  return (
    <div>
      <Table
        dataSource={sortedPrices}
        columns={columns}
        rowKey={(record) =>
          `${record.itemName ?? ''}-${record.freePrice ?? ''}-${record.proPrice ?? ''}-${record.costUnit ?? ''}`
        }
        pagination={false}
        locale={{ emptyText: 'No prices available' }}
        style={{ fontSize: '16px', color: '#002766', backgroundColor: 'transparent' }}
        className="[&_.ant-table]:bg-transparent [&_.ant-table-cell]:bg-transparent [&_.ant-table-cell]:text-[18px] [&_.ant-table-cell]:text-[#002766] [&_.ant-table-tbody>tr]:bg-transparent [&_.ant-table-tbody>tr>td]:bg-transparent [&_.ant-table-tbody>tr>td]:text-[18px] [&_.ant-table-thead>tr]:bg-transparent [&_.ant-table-thead>tr>th]:bg-transparent [&_.ant-table-thead>tr>th]:text-[16px] [&_.ant-table-thead>tr>th]:font-normal [&_.ant-table-thead>tr>th]:tracking-[0.025em] [&_.ant-table-thead>tr>th]:text-[#A5A5A5] [&_.ant-table-thead>tr>th]:uppercase"
        components={{
          header: {
            cell: CustomHeaderCell,
          },
        }}
      />
    </div>
  );
}
