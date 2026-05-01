import { CheckCircleOutlined, CloseCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Button, InputNumber } from 'antd';
import { useDeferredValue, useState } from 'react';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';

export default function NeuronIds({
  elements,
  disabled,
  onDeleteElement,
  onAddElement,
}: {
  elements: number[];
  disabled: boolean;
  onDeleteElement: (i: number) => void;
  onAddElement: (newElements: number[]) => void;
}) {
  const [addingElement, setAddingElement] = useState(false);
  const [newElement, setNewElement] = useState<number | null>(null);
  const [warning, setWarning] = useState('');
  const [edit, setEdit] = useState(false);

  return (
    <div className="w-full">
      {warning && <div className="text-red-500">{warning}</div>}
      {!edit && <div>{elements.join(', ')}</div>}
      {edit && (
        <textarea
          defaultValue={elements.join(', ')}
          className="w-full"
          rows={20}
          onChange={(e) => {
            setWarning('');
            const newElements = e.target.value;
            let values: number[] = [];
            try {
              values = parseCsvIntegers(newElements);
            } catch (e) {
              setWarning(e.message);
            }
            onAddElement(values);
          }}
        />
      )}
      <Button className="text-primary-8" onClick={() => setEdit(!edit)} disabled={!!warning}>
        {edit ? 'OK' : 'Edit'}
      </Button>
    </div>
  );

  return (
    <div
      className="text-primary-8 mt-2 flex flex-col gap-2"
      data-scan-config-block-element={ScanConfigUIElementDict.NeuronIds}
    >
      <div className="flex flex-wrap gap-3">
        {elements.map((e, i) => (
          // eslint-disable-next-line
          <div key={i} className="flex gap-1">
            {e} {!disabled && <CloseCircleOutlined onClick={() => onDeleteElement(i)} />}
          </div>
        ))}
      </div>
      {!addingElement && !disabled && (
        <PlusCircleOutlined onClick={() => setAddingElement(true)} className="text-primary-8" />
      )}
      {addingElement && !disabled && (
        <div className="flex gap-2">
          <InputNumber
            disabled={disabled}
            step={1}
            min={0}
            onChange={(newV) => {
              setNewElement(newV);
            }}
          />
          {newElement !== null && (
            <CheckCircleOutlined
              className="text-primary-8"
              onClick={() => {
                if (newElement !== null) {
                  onAddElement(newElement);
                }
              }}
            />
          )}
          <CloseCircleOutlined
            onClick={() => {
              setAddingElement(false);
              setNewElement(null);
            }}
            className="text-primary-8"
          />
        </div>
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
