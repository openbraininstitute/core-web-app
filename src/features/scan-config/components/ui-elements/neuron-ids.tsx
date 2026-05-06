import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  EditOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import { Button, InputNumber } from 'antd';
import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';

import { type ConfigValue, ScanConfigUIElementDict } from '@/features/scan-config/types';

import { isPlainObject } from '../utils';

export default function NeuronIds({
  value,
  disabled,
  onDeleteElement,
  onAddElement,
}: {
  value: ConfigValue;
  disabled: boolean;
  onDeleteElement: (i: number) => void;
  onAddElement: (newElements: number[] | null) => void;
}) {
  const [addingElement, setAddingElement] = useState(false);
  const [newElement, setNewElement] = useState<number | null>(null);
  const [warning, setWarning] = useState('');
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState('');

  const allElements = useMemo(() => {
    const namedTupleArray = Array.isArray(value) ? value : [value];

    const allElements: number[] = namedTupleArray.flatMap((v) => {
      if (isPlainObject(v) && Array.isArray(v.elements)) {
        return v.elements;
      }
      return [];
    });
    return allElements;
  }, [value]);

  const renderedElements = useMemo(() => {
    const total = allElements.length;
    const LIMIT = 12;

    if (total <= LIMIT * 2) {
      return {
        head: allElements,
        tail: [],
      };
    }

    return {
      head: allElements.slice(0, LIMIT),
      tail: allElements.slice(-LIMIT),
    };
  }, [allElements]);

  const defaultText = useMemo(() => {
    return allElements.join(', ');
  }, [allElements]);

  const handleEditClick = useCallback(() => {
    setEdit(true);
  }, []);

  if (value === null) {
    return;
  }

  return (
    <div className="w-full ">
      {warning && <div className="text-red-500">{warning}</div>}
      {!edit && <Ids ids={renderedElements} onEditClick={handleEditClick} disabled={disabled} />}
      {!disabled && !edit && (
        <div className="flex mt-2 gap-2 w-[80%] float-right">
          <button
            type="button"
            className="text-gray-500  flex justify-center items-center py-2 rounded-full text-primary-9 w-[100px] text-sm gap-3 relative left-[15px]"
            onClick={() => onAddElement(null)}
            disabled={disabled}
          >
            Clear list
          </button>
          <button
            type="button"
            className="text-gray-500  flex justify-center items-center border border-gray-200 py-2 rounded-full text-primary-9 w-[100px] text-sm gap-3"
            onClick={handleEditClick}
            disabled={disabled}
          >
            Edit ID list <EditOutlined className="text-xs" />
          </button>
          <button
            type="button"
            className="text-gray-500  flex justify-center items-center border border-gray-200 py-2 rounded-full text-primary-9 w-[100px] text-sm gap-3"
            onClick={handleEditClick}
            disabled={disabled}
          >
            Copy ID list <CopyOutlined className="text-xs" />
          </button>
        </div>
      )}
      {edit && (
        <textarea
          defaultValue={defaultText}
          className="w-full"
          rows={20}
          onChange={(e) => {
            setWarning('');
            setText(e.target.value);
            // onAddElement(values);
          }}
        />
      )}
      {!disabled && edit && (
        <Button
          className="text-primary-8"
          onClick={() => {
            if (edit) {
              try {
                const values = parseCsvIntegers(text);
                onAddElement(values);
              } catch (e) {
                setWarning((e as Error).message);
              }
            }
            setEdit(!edit);
          }}
          disabled={!!warning}
        >
          OK
        </Button>
      )}
    </div>
  );
}

function parseCsvIntegers(data: string): number[] {
  if (!data) {
    return [];
  }

  const result: number[] = [];
  let line = 1;
  let col = 1;
  let itemStartLine = 1;
  let itemStartCol = 1;
  let currentItem = '';

  const isValidInteger = (str: string): boolean => {
    return /^-?\d+$/.test(str.trim());
  };

  for (let i = 0; i < data.length; i++) {
    const char = data[i];

    if (char === ',') {
      if (!isValidInteger(currentItem)) {
        throw new Error(
          `Invalid integer '${currentItem}' at line ${itemStartLine}, column ${itemStartCol}`
        );
      }
      result.push(parseInt(currentItem.trim(), 10));

      currentItem = '';
      col++;
      itemStartLine = line;
      itemStartCol = col;
    } else {
      currentItem += char;
      if (char === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
    }
  }

  if (currentItem.length > 0 || data.endsWith(',')) {
    if (!isValidInteger(currentItem)) {
      throw new Error(
        `Invalid integer '${currentItem}' at line ${itemStartLine}, column ${itemStartCol}`
      );
    }
    result.push(parseInt(currentItem.trim(), 10));
  }

  return result;
}

const Ids = memo(
  ({
    ids,
    onEditClick,
    disabled,
  }: {
    ids: { head: number[]; tail: number[] };
    onEditClick: () => void;
    disabled: boolean;
  }) => {
    const containerClass = 'w-full grid grid-cols-4 gap-1';
    const elementClass =
      'border border-gray-200 rounded-full px-3 py-1 text-primary-8 font-bold flex items-center justify-center';

    return (
      <div className="border border-gray-200 p-3 rounded-lg w-full ">
        <div className={containerClass}>
          {ids.head.map((id, idx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: array is readonly
            <div key={idx} className={elementClass}>
              {id}
            </div>
          ))}
        </div>

        {ids.tail.length > 0 && (
          <div className="w-full flex justify-center my-3">
            {!disabled && (
              <button
                type="button"
                className="text-gray-500  flex justify-center items-center border border-gray-200 py-2 rounded-full text-primary-9 w-[100px] text-sm"
                onClick={onEditClick}
                disabled={disabled}
              >
                Edit all IDs
              </button>
            )}
            {disabled && (
              <div className="text-gray-500 flex justify-center items-center  text-primary-8 w-[100px] text-2xl relative bottom-[5px]">
                ...
              </div>
            )}
          </div>
        )}

        {ids.tail.length > 0 && (
          <div className={containerClass}>
            {ids.tail.map((id, idx) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: array is readonly
              <div key={idx} className={elementClass}>
                {id}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);
