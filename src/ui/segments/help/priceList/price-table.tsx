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
  customCostUnit: string | null = null
): string => {
  if (!costUnit) return '';
  // If costUnit is "custom", always use customCostUnit (even if empty, to show price)
  if (costUnit === 'custom') {
    return customCostUnit || '';
  }
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

const formatNumber = (value: number | string): string => {
  const num = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString('en-US');
};

// Check if a string value is a pure number (only digits, decimal point, and whitespace)
const isPureNumber = (value: string): boolean => {
  // Remove whitespace and check if it's a valid number
  const trimmed = value.trim();
  return /^-?\d*\.?\d+$/.test(trimmed);
};

const formatQuantityRange = (value: string): string => {
  // Check if the value contains a range (e.g., "500-999" or "25000-49999")
  if (value.includes('-')) {
    const parts = value.split('-').map((part) => part.trim());
    if (parts.length === 2) {
      const start = Number.parseFloat(parts[0]);
      const end = Number.parseFloat(parts[1]);

      // Format each number with commas if > 999
      const formattedStart =
        !Number.isNaN(start) && start > 999 ? start.toLocaleString('en-US') : parts[0];
      const formattedEnd = !Number.isNaN(end) && end > 999 ? end.toLocaleString('en-US') : parts[1];

      return `${formattedStart}-${formattedEnd}`;
    }
  }
  // If not a range, format as single number
  const num = Number.parseFloat(value);
  if (!Number.isNaN(num) && num > 999) {
    return num.toLocaleString('en-US');
  }
  return value;
};

const formatSectionName = (section: string): string => {
  // Special case for aiAssistant
  if (section.toLowerCase() === 'aiassistant') {
    return 'AI Assistant';
  }
  // Convert camelCase to Title Case
  return section
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();
};

// Normalize section name for matching (case-insensitive, handle variations)
const normalizeSectionName = (section: string): string => {
  return section.toLowerCase().replace(/\s+/g, ' ').trim();
};

// Get section order priority (lower number = higher priority)
// Sections are ordered by parent category first, then by sub-section order
const getSectionOrder = (section: string): number => {
  const normalized = normalizeSectionName(section);
  const sectionLower = section.toLowerCase();

  // Debug logging for Microcircuits sections
  if (normalized.includes('microcircuit')) {
    // eslint-disable-next-line no-console
    console.log(
      `[Section Order] Microcircuit section found: "${section}" | normalized: "${normalized}" | includes >10: ${normalized.includes('>10') || normalized.includes('> 10') || section.includes('>10') || section.includes('> 10')}`
    );
  }

  // Determine parent category and sub-section order
  // Build section: 1) Single cell; 2) Synaptome; 3) Ion channel
  if (sectionLower.includes('build')) {
    if (normalized.includes('single cell')) return 101;
    if (normalized.includes('synaptome')) return 102;
    if (normalized.includes('ion channel')) return 103;
    return 100; // Other build sections
  }

  // Simulate section: 1) E-models; 2) Ion channel; 3) Single cell; 4) Synaptome; 5) Small Microcircuits (<= 10 neurons); 6) Microcircuits (>10 neurons)
  if (sectionLower.includes('simulate')) {
    // Check for Microcircuits (>10 neurons) FIRST to ensure it gets the highest order (209)
    // This must be checked before other microcircuit checks
    if (
      normalized.includes('microcircuit') &&
      (normalized.includes('>10') ||
        normalized.includes('> 10') ||
        normalized.includes('greater than 10') ||
        section.includes('>10') ||
        section.includes('> 10'))
    ) {
      return 209; // Microcircuits (>10 neurons) at the end
    }
    if (normalized.includes('e-model') || normalized.includes('emodel')) return 201;
    if (normalized.includes('ion channel')) return 202;
    if (normalized.includes('single cell')) return 203;
    if (normalized.includes('synaptome')) return 204;
    if (normalized.includes('small microcircuit') || normalized.includes('<= 10')) return 205;
    return 200; // Other simulate sections
  }

  // Notebooks section: 1) Running notebooks; 2) EM Skeletonization
  if (sectionLower.includes('notebook')) {
    if (normalized.includes('running notebook')) return 301;
    if (normalized.includes('skeletonization') || normalized.includes('em skeleton')) return 302;
    return 300; // Other notebook sections
  }

  // Check for sections without explicit parent category (try to match by name)
  // IMPORTANT: Check Microcircuits (>10 neurons) FIRST to ensure it gets order 209 (highest in Simulate)
  // This must be checked before other microcircuit checks to avoid early matching
  if (
    normalized.includes('microcircuit') &&
    (normalized.includes('>10') ||
      normalized.includes('> 10') ||
      normalized.includes('greater than 10') ||
      section.includes('>10') ||
      section.includes('> 10'))
  ) {
    return 209; // Microcircuits (>10 neurons) at the end of Simulate - highest order
  }
  // Now check other simulate items
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
  // Check build items
  if (normalized.includes('single cell') && normalized.includes('build')) {
    return 101;
  }
  if (normalized.includes('synaptome') && normalized.includes('build')) {
    return 102;
  }
  if (normalized.includes('ion channel') && normalized.includes('build')) {
    return 103;
  }
  // Any other microcircuit (without >10) should come before the >10 one
  if (normalized.includes('microcircuit')) {
    return 205; // Treat as small microcircuit if no size specified
  }
  if (normalized.includes('running notebook')) {
    return 301;
  }
  if (normalized.includes('skeletonization') || normalized.includes('em skeleton')) {
    return 302;
  }

  // Default: put at the end
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
      // eslint-disable-next-line no-console
      console.log(
        'Free plan - Item:',
        record.itemName,
        'freePrice:',
        value,
        'Full record:',
        record
      );
      if (value === null) return <span style={{ color: '#002766' }}>-</span>;

      // If value contains text (not a pure number), display the full string
      if (!isPureNumber(value)) {
        // If costUnit is custom, add customCostUnit after the full text
        if (record.costUnit === 'custom' && record.customCostUnit) {
          return (
            <span style={{ color: '#002766' }}>
              <span style={{ fontWeight: 'bold' }}>{value}</span>
              {` ${record.customCostUnit}`}
            </span>
          );
        }
        // Otherwise, just display the full text without unit
        return (
          <span style={{ color: '#002766' }}>
            <span style={{ fontWeight: 'bold' }}>{value}</span>
          </span>
        );
      }

      // If costUnit is custom, display price with customCostUnit directly
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

      // Otherwise, use the standard unit display logic
      const unitDisplay = getCostUnitDisplay(record.costUnit, record.customCostUnit);
      const numValue = Number.parseFloat(value);
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
      // eslint-disable-next-line no-console
      console.log('Pro plan - Item:', record.itemName, 'proPrice:', value, 'Full record:', record);
      if (value === null) return <span style={{ color: '#002766' }}>-</span>;

      // If value contains text (not a pure number), display the full string
      if (!isPureNumber(value)) {
        // If costUnit is custom, add customCostUnit after the full text
        if (record.costUnit === 'custom' && record.customCostUnit) {
          return (
            <span style={{ color: '#002766' }}>
              <span style={{ fontWeight: 'bold' }}>{value}</span>
              {` ${record.customCostUnit}`}
            </span>
          );
        }
        // Otherwise, just display the full text without unit
        return (
          <span style={{ color: '#002766' }}>
            <span style={{ fontWeight: 'bold' }}>{value}</span>
          </span>
        );
      }

      // If costUnit is custom, display price with customCostUnit directly
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

      // Otherwise, use the standard unit display logic
      const unitDisplay = getCostUnitDisplay(record.costUnit, record.customCostUnit);
      const numValue = Number.parseFloat(value);
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
      // Sort by freePrice (smallest to greatest), handling null values
      const priceA = a.freePrice ? Number.parseFloat(a.freePrice) : Infinity;
      const priceB = b.freePrice ? Number.parseFloat(b.freePrice) : Infinity;
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
    // Special case: "Microcircuit (>10 neurons)" should always be last in Simulate section
    Object.keys(grouped).forEach((section) => {
      const sectionLower = section.toLowerCase();
      grouped[section].sort((a, b) => {
        const nameA = (a.itemName ?? '').toLowerCase();
        const nameB = (b.itemName ?? '').toLowerCase();

        // In Simulate section, put "Microcircuit (>10 neurons)" at the end
        if (sectionLower.includes('simulate')) {
          const aIsLargeMicrocircuit =
            nameA.includes('microcircuit') && (nameA.includes('>10') || nameA.includes('> 10'));
          const bIsLargeMicrocircuit =
            nameB.includes('microcircuit') && (nameB.includes('>10') || nameB.includes('> 10'));

          // If one is large microcircuit and the other isn't, large microcircuit goes last
          if (aIsLargeMicrocircuit && !bIsLargeMicrocircuit) return 1;
          if (!aIsLargeMicrocircuit && bIsLargeMicrocircuit) return -1;
          // If both are large microcircuit or both aren't, sort by price as normal
        }

        const priceA = a.freePrice ? Number.parseFloat(a.freePrice) : Infinity;
        const priceB = b.freePrice ? Number.parseFloat(b.freePrice) : Infinity;
        if (priceA !== priceB) {
          return priceA - priceB;
        }
        // If prices are equal, sort by itemName alphabetically
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

      {/* Prices Tables by Section */}
      {Object.entries(pricesBySection)
        .sort(([sectionA], [sectionB]) => {
          const orderA = getSectionOrder(sectionA);
          const orderB = getSectionOrder(sectionB);
          // eslint-disable-next-line no-console
          console.log(`Section ordering: "${sectionA}" = ${orderA}, "${sectionB}" = ${orderB}`);
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          // If same order, sort alphabetically
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
