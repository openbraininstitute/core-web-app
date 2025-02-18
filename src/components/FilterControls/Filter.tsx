import { useCallback, useState, useMemo, ReactNode } from 'react';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { Column } from './ControlPanel';
import { isNull } from 'lodash/fp';

export function useToggleColumns<T>(columns: Column<T>[]) {
  const [columnHidden, setColumnHidden] = useState(() => {
    return Object.fromEntries(columns.map((c) => [c.key, false])) as Record<keyof T, boolean>;
  });

  const toggleColumn = useCallback(
    (key: keyof T) => {
      setColumnHidden({ ...columnHidden, [key]: !columnHidden[key] });
    },
    [columnHidden]
  );

  const isColumnHidden = useCallback(
    (key: keyof T) => {
      return columnHidden[key];
    },
    [columnHidden]
  );

  return {
    filteredColumns: columns.filter((c) => columnHidden[c.key as keyof T] === false),
    toggleColumn,
    isColumnHidden,
  };
}

export function useFilters<T>(data: T[]) {
  const [filters, setFilters] = useState<{
    [K in keyof T]?: {
      value: T[K] | null;
      fun: (d: T[K]) => boolean;
    };
  }>({});

  const applyFilters = useCallback(
    (item: T) => {
      for (const [dataIndex, filter] of Object.entries(filters)) {
        const filterTyped = filter as {
          value: T[keyof T] | null;
          fun: (d: T[keyof T]) => boolean;
        };

        if (filterTyped.value && !filterTyped.fun(item[dataIndex as keyof T])) {
          return false;
        }
      }
      return true;
    },
    [filters]
  );

  // eslint-disable-next-line
  const onFilterChange = useCallback(function onFilterChange<K extends keyof T>(
    dataIndex: K,
    value: T[K] | null,
    filterFun: (value: T[K]) => boolean
  ) {
    setFilters((f) => {
      return {
        ...f,
        [dataIndex]: {
          value,
          fun: (d: T[K]) => filterFun(d),
        },
      };
    });
  }, []);

  const onChange = useCallback(
    // eslint-disable-next-line
    function <K extends keyof T>(dataIndex: K, value: T[K]) {
      onFilterChange(dataIndex, value ?? null, (colValue) => {
        if (!value || typeof value !== 'string' || typeof colValue !== 'string') return true;

        return colValue.toLocaleLowerCase().includes(value);
      });
    },
    [onFilterChange]
  );

  const onDateChange = useCallback(
    // eslint-disable-next-line
    function <K extends keyof T>(dataIndex: K, values: [Date | null, Date | null] | null) {
      onFilterChange(dataIndex, values as T[K] | null, (value) => {
        if (!value && values) return false;
        if (!values) return true;

        const date = new Date(value as string);
        const [start, end] = values;

        if (start && date < start) {
          return false;
        }

        if (end && date > end) {
          return false;
        }

        return true;
      });
    },
    [onFilterChange]
  );

  const onFilterReset = useCallback(() => {
    setFilters({});
  }, []);

  const filterValue = useCallback(
    // eslint-disable-next-line
    function <K extends keyof T>(dataIndex: K) {
      return filters[dataIndex]?.value ?? null;
    },
    [filters]
  );

  return {
    onFilterChange,
    onChange,
    onDateChange,
    onFilterReset,
    filterValue,
    filteredData: useMemo(() => data.filter(applyFilters), [data, applyFilters]),
    filterCount: Object.values(filters).filter((f) => (f as { value: T[keyof T] }).value !== null)
      .length,
  };
}

export default function ColumnToggle({
  onToggle,
  hidden = false,
  title,
  children,
}: {
  onToggle: () => void;
  hidden?: boolean;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex cursor-pointer items-center gap-3">
        {!hidden && <EyeOutlined className="text-white" onClick={onToggle} />}
        {hidden && <EyeInvisibleOutlined className="text-[#69C0FF]" onClick={onToggle} />}
        {title}
      </div>

      {children}
    </div>
  );
}
