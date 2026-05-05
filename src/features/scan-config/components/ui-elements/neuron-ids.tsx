import { CheckCircleOutlined, CloseCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Button, InputNumber } from 'antd';
import { memo, useDeferredValue, useMemo, useState } from 'react';

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
  onAddElement: (newElements: number[]) => void;
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
    const LIMIT = 10000;

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

  return (
    <div className="w-full ">
      {warning && <div className="text-red-500">{warning}</div>}
      {!edit && <Ids ids={renderedElements} />}
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
      {!disabled && (
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
          {edit ? 'OK' : 'Edit'}
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

const Ids = memo(({ ids }: { ids: { head: number[]; tail: number[] } }) => {
  const containerClass = 'w-full border border-gray-200 p-3 rounded-lg flex flex-wrap gap-1';
  const elementClass = 'border border-gray-200 rounded-full px-3 py-1 text-primary-8 font-bold';
  return (
    <>
      <div className={containerClass}>
        {ids.head.map((id) => (
          <div key={id} className={elementClass}>
            {id}
          </div>
        ))}
      </div>

      {ids.tail.length > 0 && <div className="text-gray-500 text-4xl mb-5">...</div>}

      {ids.tail.length > 0 && (
        <div className={containerClass}>
          {ids.tail.map((id) => (
            <div key={id} className={elementClass}>
              {id}
            </div>
          ))}
        </div>
      )}
    </>
  );
});
