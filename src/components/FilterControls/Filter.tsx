import { useCallback, useState, useMemo, ReactNode } from 'react';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { Column } from './ControlPanel';

export function useToggleColumns<T>(columns: Column<T>[]) {
  const [columnHidden, setColumnHidden] = useState(() => {
    const cols: { [key: string]: boolean } = {};
    columns.forEach((c) => {
      cols[c.key] = false;
    });
    return cols;
  });

  const toggleColumn = useCallback(
    (key: keyof T) => {
      setColumnHidden({ ...columnHidden, [key]: !columnHidden[key as string] });
    },
    [columnHidden]
  );

  const isColumnHidden = useCallback(
    (key: keyof T) => {
      const column = columns.find((col) => col.key === key);
      return !!column?.hidden;
    },
    [columns]
  );

  return {
    filteredColumns: columns.filter((c) => columnHidden[c.key] === false),
    toggleColumn,
    isColumnHidden,
  };
}

export function useFilters<T>(data: T[]) {
  const [filters, setFilters] = useState<{
    [K in keyof T]?: {
      isActive: boolean;
      fun: (d: T[K]) => boolean;
    };
  }>({});

  const applyFilters = useCallback(
    (item: T) => {
      for (const [dataIndex, filter] of Object.entries(filters)) {
        const filterTyped = filter as {
          isActive: boolean;
          fun: (d: T[keyof T]) => boolean;
        };

        if (filterTyped.isActive && !filterTyped.fun(item[dataIndex as keyof T])) {
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
    isActive: boolean,
    filterFun: (value: T[K]) => boolean
  ) {
    setFilters((f) => {
      return {
        ...f,
        [dataIndex]: {
          isActive,
          fun: (d: T[K]) => filterFun(d),
        },
      };
    });
  }, []);

  const onDateChange = useCallback(
    // eslint-disable-next-line
    function <K extends keyof T>(dataIndex: K, values: [Date | null, Date | null] | null) {
      onFilterChange(dataIndex, values !== null, (value) => {
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

  return {
    onFilterChange,
    onDateChange,
    filteredData: useMemo(() => data.filter(applyFilters), [data, applyFilters]),
    filterCount: Object.values(filters).map((f) => (f as { isActive: boolean }).isActive).length,
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
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div className="mb-3 flex cursor-pointer items-center gap-3">
        {!hidden && <EyeOutlined className="text-white" onClick={onToggle} />}
        {hidden && <EyeInvisibleOutlined className="text-[#69C0FF]" onClick={onToggle} />}
        <button
          type="button"
          onClick={() => {
            setExpanded(!expanded);
          }}
        >
          {title}
        </button>
      </div>

      {expanded && children}
    </div>
  );
}
