import { Notebook } from '@/util/virtual-lab/github';
import { Input } from 'antd';
import { ColumnType } from 'antd/lib/table';
import { useRef, useCallback, useState } from 'react';
import { EyeIconOutline } from '../icons/EyeIcon';
import { EyeFilled, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';

import { Column } from './FilterControls';

export default function useFilters<T>(
  columns: Column<T>[],
  setColumns: (columns: Column<T>[]) => void
) {
  const keys = columns.map((c) => c.key).filter((v) => typeof v === 'string');

  const filters = useRef<
    {
      columnKey: string;
      function: null | Function;
    }[]
  >(
    keys.map((k) => {
      return {
        columnKey: k,
        function: null,
      };
    })
  );

  const Filter = useCallback(
    ({ columnKey }: { columnKey: string }) => {
      const [expanded, setExpanded] = useState(false);
      if (!keys.includes(columnKey)) throw new Error(`Invalid dataKey, must be ${keys.join(', ')}`);
      const columnIndex = columns.findIndex((c) => c.key === columnKey);
      const column = columns[columnIndex];

      const handleEyeClick = () => {
        setColumns([
          ...columns.slice(0, columnIndex),
          { ...column, hidden: !column.hidden },
          ...columns.slice(columnIndex + 1),
        ]);
      };

      return (
        <div className="flex items-center gap-3">
          {!column.hidden && <EyeOutlined className="text-white" onClick={handleEyeClick} />}
          {column.hidden && (
            <EyeInvisibleOutlined className="text-[#69C0FF]" onClick={handleEyeClick} />
          )}
          <div onClick={() => setExpanded(!expanded)}>
            {typeof column.title === 'string' ? column.title : column.key}
            {expanded && (
              <Input
                onChange={(e) => {
                  const filter = filters.current.find((f) => f.columnKey === columnKey);
                  if (filter)
                    filter.function = () => {
                      console.log('Applying filter', columnKey);
                    };
                }}
              />
            )}
          </div>
        </div>
      );
    },
    [keys]
  );

  return { filters: filters.current, Filter };
}
