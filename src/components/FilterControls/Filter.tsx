import { useCallback, useState, useMemo, ReactNode } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { Column } from './ControlPanel';

export function useToggleColumns<T>(initialColumns: Column<T>[]) {
  const [columns, setColumns] = useState(initialColumns);

  const toggleColumn = useCallback((key: keyof T) => {
    setColumns((prevColumns) =>
      prevColumns.map((column) =>
        column.key === key ? { ...column, hidden: !column.hidden } : column
      )
    );
  }, []);

  const isColumnHidden = useCallback(
    (key: keyof T) => {
      const column = columns.find((col) => col.key === key);
      return !!column?.hidden;
    },
    [columns]
  );

  return { columns, toggleColumn, isColumnHidden };
}

export function useFilters<T>(data: T[]) {
  const [filters, setFilters] = useState<{ [K in keyof T]?: (d: T[K]) => boolean }>({});

  const applyFilters = useCallback(
    (item: T) => {
      for (const [dataIndex, filterF] of Object.entries(filters) as [
        keyof T,
        ((d: T[keyof T]) => boolean) | undefined,
      ][]) {
        if (filterF && !filterF(item[dataIndex])) {
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
    filterFun: (value: T[K]) => boolean
  ) {
    setFilters((f) => ({
      ...f,
      [dataIndex]: (d: T[K]) => filterFun(d),
    }));
  }, []);

  const onDateChange = useCallback(
    // eslint-disable-next-line
    function <K extends keyof T>(dataIndex: K, values: [Dayjs | null, Dayjs | null] | null) {
      onFilterChange(dataIndex, (value) => {
        if (!value && values) return false;
        if (!values) return true;

        const date = dayjs(value as string);
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
