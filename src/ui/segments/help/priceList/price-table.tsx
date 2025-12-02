'use client';

import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo } from 'react';

import type { CreditsPack } from '@/app/api/help/credits/route';
import type { SinglePrice } from '@/app/api/help/prices/route';
import { cn } from '@/utils/css-class';

type PriceTableProps = {
  prices: SinglePrice[];
  creditsPacks: CreditsPack[];
  backgroundTitle?: string;
};

const costUnitDictionary: Record<string, string> = {
  creditsSimulation: 'credits / simulation',
  creditsNeuron: 'credits / neuron',
  creditsBuild: 'credits / build',
  creditsHour: 'credits / hour',
  creditsNeuronSecond: 'credits / neuron / second of biological time',
};

const getCostUnitDisplay = (
  costUnit: string | null,
  customCostUnit: string | null = null,
  priceValue: number | null = null
): string => {
  if (!costUnit) return '';

  if (costUnit === 'custom') {
    return customCostUnit || '';
  }

  let unitDisplay = costUnitDictionary[costUnit] ?? costUnit;

  // If price is 1, use singular "credit" instead of "credits"
  if (priceValue === 1 && unitDisplay.startsWith('credits')) {
    unitDisplay = unitDisplay.replace(/^credits/, 'credit');
  }

  return unitDisplay;
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
      {...props}
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

const isPureNumber = (value: string): boolean => {
  const trimmed = value.trim();
  return /^-?\d*\.?\d+$/.test(trimmed);
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

const formatSectionName = (section: string): string => {
  if (section.toLowerCase() === 'aiassistant') {
    return 'AI Assistant';
  }

  return section
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

const normalizeSectionName = (section: string): string => {
  return section.toLowerCase().replace(/\s+/g, ' ').trim();
};

const getSectionOrder = (section: string): number => {
  const normalized = normalizeSectionName(section);
  const sectionLower = section.toLowerCase();

  if (sectionLower.includes('build')) {
    if (normalized.includes('ion channel')) return 101;
    if (normalized.includes('single cell')) return 102;
    if (normalized.includes('synaptome')) return 103;
    return 100;
  }

  if (sectionLower.includes('simulate')) {
    if (
      normalized.includes('microcircuit') &&
      (normalized.includes('>10') ||
        normalized.includes('> 10') ||
        normalized.includes('greater than 10') ||
        section.includes('>10') ||
        section.includes('> 10'))
    ) {
      return 209;
    }
    if (normalized.includes('e-model') || normalized.includes('emodel')) return 201;
    if (normalized.includes('ion channel')) return 202;
    if (normalized.includes('single cell')) return 203;
    if (normalized.includes('synaptome')) return 204;
    if (normalized.includes('small microcircuit') || normalized.includes('<= 10')) return 205;
    return 200;
  }

  // Notebooks section: 1) Running notebooks; 2) EM Skeletonization
  if (sectionLower.includes('notebook')) {
    if (normalized.includes('running notebook')) return 301;
    if (normalized.includes('skeletonization') || normalized.includes('em skeleton')) return 302;
    return 300;
  }

  if (
    normalized.includes('microcircuit') &&
    (normalized.includes('>10') ||
      normalized.includes('> 10') ||
      normalized.includes('greater than 10') ||
      section.includes('>10') ||
      section.includes('> 10'))
  ) {
    return 209;
  }
  if (normalized.includes('e-model') || normalized.includes('emodel')) {
    return 201;
  }
  if (normalized.includes('ion channel') && !normalized.includes('build')) {
    return 202;
  }
  if (normalized.includes('single cell') && !normalized.includes('build')) {
    return 203;
  }
  if (normalized.includes('synaptome') && !normalized.includes('build')) {
    return 204;
  }
  if (normalized.includes('small microcircuit') || normalized.includes('<= 10')) {
    return 205;
  }
  if (normalized.includes('ion channel') && normalized.includes('build')) {
    return 101;
  }
  if (normalized.includes('single cell') && normalized.includes('build')) {
    return 102;
  }
  if (normalized.includes('synaptome') && normalized.includes('build')) {
    return 103;
  }
  if (normalized.includes('microcircuit')) {
    return 205;
  }
  if (normalized.includes('running notebook')) {
    return 301;
  }
  if (normalized.includes('skeletonization') || normalized.includes('em skeleton')) {
    return 302;
  }

  return 999;
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
    render: (value: string | null, record: SinglePrice) => {
      if (value === null) return <span style={{ color: '#002766' }}>-</span>;

      if (!isPureNumber(value)) {
        if (record.costUnit === 'custom' && record.customCostUnit) {
          return (
            <span style={{ color: '#002766' }}>
              <span style={{ fontWeight: 'bold' }}>{value}</span>
              {` ${record.customCostUnit}`}
            </span>
          );
        }
        return (
          <span style={{ color: '#002766' }}>
            <span style={{ fontWeight: 'bold' }}>{value}</span>
          </span>
        );
      }

      if (record.costUnit === 'custom') {
        const numValue = Number.parseFloat(value);
        const displayValue = Number.isNaN(numValue) ? value : numValue;
        return (
          <span style={{ color: '#002766' }}>
            <span style={{ fontWeight: 'bold' }}>{displayValue}</span>
            {record.customCostUnit ? ` ${record.customCostUnit}` : ''}
          </span>
        );
      }

      const numValue = Number.parseFloat(value);
      const unitDisplay = getCostUnitDisplay(
        record.costUnit,
        record.customCostUnit,
        Number.isNaN(numValue) ? null : numValue
      );
      return (
        <span style={{ color: '#002766' }}>
          <span style={{ fontWeight: 'bold' }}>{Number.isNaN(numValue) ? value : numValue}</span>{' '}
          {unitDisplay ? ` ${unitDisplay}` : ''}
        </span>
      );
    },
  },
  {
    title: 'Pro plan',
    dataIndex: 'proPrice',
    key: 'proPrice',
    render: (value: string | null, record: SinglePrice) => {
      if (value === null) return <span style={{ color: '#002766' }}>-</span>;

      if (!isPureNumber(value)) {
        if (record.costUnit === 'custom' && record.customCostUnit) {
          return (
            <span style={{ color: '#002766' }}>
              <span style={{ fontWeight: 'bold' }}>{value}</span>
              {` ${record.customCostUnit}`}
            </span>
          );
        }
        return (
          <span style={{ color: '#002766' }}>
            <span style={{ fontWeight: 'bold' }}>{value}</span>
          </span>
        );
      }

      if (record.costUnit === 'custom') {
        const numValue = Number.parseFloat(value);
        const displayValue = Number.isNaN(numValue) ? value : numValue;
        return (
          <span style={{ color: '#002766' }}>
            <span style={{ fontWeight: 'bold' }}>{displayValue}</span>
            {record.customCostUnit ? ` ${record.customCostUnit}` : ''}
          </span>
        );
      }

      const numValue = Number.parseFloat(value);
      const unitDisplay = getCostUnitDisplay(
        record.costUnit,
        record.customCostUnit,
        Number.isNaN(numValue) ? null : numValue
      );
      return (
        <span style={{ color: '#002766' }}>
          <span style={{ fontWeight: 'bold' }}>{Number.isNaN(numValue) ? value : numValue}</span>{' '}
          {unitDisplay ? ` ${unitDisplay}` : ''}
        </span>
      );
    },
  },
];

export default function PriceTable({
  prices,
  creditsPacks,
  backgroundTitle = 'white/50',
}: PriceTableProps) {
  const sortedPrices = useMemo(() => {
    return [...prices].sort((a, b) => {
      const priceA = a.freePrice ? Number.parseFloat(a.freePrice) : Infinity;
      const priceB = b.freePrice ? Number.parseFloat(b.freePrice) : Infinity;
      if (priceA !== priceB) {
        return priceA - priceB;
      }
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
    Object.keys(grouped).forEach((section) => {
      const sectionLower = section.toLowerCase();
      grouped[section].sort((a, b) => {
        const nameA = (a.itemName ?? '').toLowerCase();
        const nameB = (b.itemName ?? '').toLowerCase();

        if (sectionLower.includes('build')) {
          const getBuildPriority = (name: string): number => {
            if (name.includes('ion channel')) return 1;
            if (name.includes('single cell')) return 2;
            if (name.includes('synaptome')) return 3;
            return 999;
          };

          const priorityA = getBuildPriority(nameA);
          const priorityB = getBuildPriority(nameB);
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }
        }

        if (sectionLower.includes('simulate')) {
          const aIsIonChannel = nameA.includes('ion channel');
          const bIsIonChannel = nameB.includes('ion channel');
          const aIsLargeMicrocircuit =
            nameA.includes('microcircuit') && (nameA.includes('>10') || nameA.includes('> 10'));
          const bIsLargeMicrocircuit =
            nameB.includes('microcircuit') && (nameB.includes('>10') || nameB.includes('> 10'));

          if (aIsIonChannel && !bIsIonChannel) return -1;
          if (!aIsIonChannel && bIsIonChannel) return 1;

          if (aIsLargeMicrocircuit && !bIsLargeMicrocircuit) return 1;
          if (!aIsLargeMicrocircuit && bIsLargeMicrocircuit) return -1;
        }

        const priceA = a.freePrice ? Number.parseFloat(a.freePrice) : Infinity;
        const priceB = b.freePrice ? Number.parseFloat(b.freePrice) : Infinity;
        if (priceA !== priceB) {
          return priceA - priceB;
        }
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

      {Object.entries(pricesBySection)
        .sort(([sectionA], [sectionB]) => {
          const orderA = getSectionOrder(sectionA);
          const orderB = getSectionOrder(sectionB);
          if (orderA !== orderB) {
            return orderA - orderB;
          }

          return sectionA.localeCompare(sectionB);
        })
        .map(([section, sectionPrices]) => (
          <div key={section}>
            {section !== 'Other' && (
              <h3
                className={cn(
                  'text-primary-8 mt-12 mb-4 rounded-full px-12 py-6 text-3xl! font-bold',
                  backgroundTitle
                )}
              >
                {formatSectionName(section)}
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
