import { Notebook } from '@/util/virtual-lab/github';
import { Button, Input } from 'antd';
import { ColumnType } from 'antd/lib/table';
import { useRef, useCallback, useState, useMemo } from 'react';
import { EyeIconOutline } from '../icons/EyeIcon';
import { EyeFilled, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';

import { Column } from './FilterControls';

export default function useFilters<T extends { [key: string]: any }>(
  columns: Column<T>[],
  setColumns: (columns: Column<T>[]) => void,
  dataSource: T[]
) {
  const keys = useMemo(
    () => columns.map((c) => c.key).filter((v) => typeof v === 'string'),
    [columns]
  );

  const [filteredData, setFilteredData] = useState(dataSource);

  const filters = useRef<
    {
      columnKey: string;
      function: null | ((item: T) => boolean);
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
      const [value, setValue] = useState('');
      if (!keys.includes(columnKey)) throw new Error(`Invalid dataKey, must be ${keys.join(', ')}`);
      const columnIndex = columns.findIndex((c) => c.key === columnKey);
      const column = columns[columnIndex];
      if (typeof column.dataIndex !== 'string')
        throw new Error('column.dataIndex must be a string');

      const handleEyeClick = () => {
        setColumns([
          ...columns.slice(0, columnIndex),
          { ...column, hidden: !column.hidden },
          ...columns.slice(columnIndex + 1),
        ]);
      };

      return (
        <div>
          <div className="mb-3 flex cursor-pointer items-center gap-3">
            {!column.hidden && <EyeOutlined className="text-white" onClick={handleEyeClick} />}
            {column.hidden && (
              <EyeInvisibleOutlined className="text-[#69C0FF]" onClick={handleEyeClick} />
            )}
            <div
              onClick={(e) => {
                e.preventDefault();
                setExpanded(!expanded);
              }}
            >
              {typeof column.title === 'string' ? column.title : column.key}
            </div>
          </div>

          {expanded && (
            <Input
              value={value}
              onChange={(e) => {
                const filter = filters.current.find((f) => f.columnKey === columnKey);
                setValue(e.currentTarget.value);

                const filteringFun = (item: T) => {
                  if (typeof column.dataIndex !== 'string' || !(column.dataIndex in item))
                    return true;

                  console.log('checking item dataIndex');

                  console.log(item[column.dataIndex]);

                  if (typeof item[column.dataIndex] !== 'string') return true;

                  console.log('filtering name');

                  return item[column.dataIndex]
                    .toLocaleLowerCase()
                    .includes(e.currentTarget.value.toLocaleLowerCase());
                };

                if (filter) filter.function = filteringFun;
              }}
            />
          )}
        </div>
      );
    },
    [keys]
  );

  const Apply = useCallback(() => {
    return (
      <Button
        onClick={() => {
          let d = [...dataSource];

          for (const filter of filters.current) {
            const dataIndex = columns.find((c) => c.key === filter.columnKey)?.dataIndex;

            console.log('here');
            if (!filter.function || !dataIndex || typeof dataIndex !== 'string') continue;

            d = d.filter((d) => {
              if (!filter.function) return;

              return filter.function(d);
            });
          }

          return setFilteredData(d);
        }}
      >
        Apply
      </Button>
    );
  }, [dataSource, columns]);

  return { filteredData, Filter, Apply };
}
