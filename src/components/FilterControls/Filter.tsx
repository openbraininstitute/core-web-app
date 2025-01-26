import { Notebook } from '@/util/virtual-lab/github';
import { Button, Input } from 'antd';
import { ColumnType } from 'antd/lib/table';
import {
  useRef,
  useCallback,
  useState,
  useMemo,
  ReactNode,
  SyntheticEvent,
  ChangeEvent,
} from 'react';
import { EyeIconOutline } from '../icons/EyeIcon';
import { EyeFilled, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';

import { Column } from './FilterControls';

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

export function useFilters<T>() {
  const [filters, setFilters] = useState<{ [K in keyof T]?: (d: T[K]) => boolean }>({});

  const applyFilters = useCallback(
    (data: T) => {
      for (const [dataIndex, filterF] of Object.entries(filters) as [
        keyof T,
        ((d: T[keyof T]) => boolean) | undefined,
      ][]) {
        if (filterF && !filterF(data[dataIndex])) {
          return false;
        }
      }
      return true;
    },
    [filters]
  );

  const filter = useCallback((dataIndex: keyof T, filterFun: (value: T[keyof T]) => boolean) => {
    console.log('setting filter');
    return () => {
      console.log('in filer');
      setFilters((f) => ({
        ...f,
        [dataIndex]: (d: T[keyof T]) => filterFun(d),
      }));
    };
  }, []);

  const dateRangeFilter = useCallback(
    (
      dataIndex: keyof T,
      filterFun: (value: T[keyof T], inputValues: (string | null)[]) => boolean
    ) => {
      return (values: (string | null)[]) => {
        setFilters((f) => ({
          ...f,
          [dataIndex]: (d: T[keyof T]) => filterFun(d, values),
        }));
      };
    },
    []
  );

  return { filter, applyFilters, dateRangeFilter };
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
