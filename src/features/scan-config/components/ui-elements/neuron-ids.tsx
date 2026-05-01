import { CheckCircleOutlined, CloseCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { InputNumber } from 'antd';
import { useState } from 'react';

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
  onAddElement: (newElement: number) => void;
}) {
  const [addingElement, setAddingElement] = useState(false);
  const [newElement, setNewElement] = useState<number | null>(null);

  return (
    <div className="w-full">
      <textarea className="w-full" rows={20} />
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
