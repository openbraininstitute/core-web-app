import { CloseOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { InputNumber } from 'antd';
import { useEffect, useState } from 'react';

export default function ParameterSweep({
  value,
  min,
  max,
  onChange,
  disabled,
  k,
}: {
  value: number | number[] | null;
  min: number | undefined;
  max: number | undefined;

  onChange: (v: null | number | (number | null)[]) => void;
  disabled: boolean;
  k: string;
}) {
  const [mode, setMode] = useState<'single' | 'multiple'>(
    Array.isArray(value) ? 'multiple' : 'single'
  );
  const [singleValue, setSingleValue] = useState(Array.isArray(value) ? null : value);
  const [values, setValues] = useState(Array.isArray(value) ? value : [value]);

  // When the AI agent updates the value we need to change the mode
  useEffect(() => {
    setMode(Array.isArray(value) ? 'multiple' : 'single');
    setSingleValue(Array.isArray(value) ? null : value);
    setValues(Array.isArray(value) ? value : [value]);
  }, [value]);

  if (mode === 'single' && !Array.isArray(value)) {
    return (
      <div className="relative">
        <InputNumber
          controls={false}
          min={min}
          max={max}
          disabled={disabled}
          value={value}
          onChange={(v) => {
            setSingleValue(v); // Update locally
            onChange(v); // Update in the config
          }}
          className="w-full"
        />

        {!disabled && (
          <PlusCircleOutlined
            className="text-primary-8 absolute top-[10px] right-[8px]"
            onClick={() => {
              setMode('multiple');
              onChange(values);
            }}
          />
        )}
      </div>
    );
  }

  if (mode === 'multiple') {
    return (
      <div>
        {!disabled && (
          <div className="mb-1 flex justify-end">
            <CloseOutlined
              className="text-primary-8"
              onClick={() => {
                setMode('single');
                onChange(singleValue); // Update the config
              }}
            />
          </div>
        )}
        <div className="border-neutral-2 rounded border bg-white p-3">
          <div className="flex flex-col gap-1">
            {values.map((v, i) => {
              return (
                // eslint-disable-next-line
                <div className="flex w-full justify-between gap-1" key={k + i}>
                  <InputNumber
                    status={v === null ? 'error' : undefined}
                    value={v}
                    min={min}
                    max={max}
                    disabled={disabled}
                    onChange={(newValue) => {
                      const updated = [...values];
                      updated[i] = newValue;
                      setValues(updated);
                      onChange(updated);
                    }}
                  />
                  {!disabled && (
                    <div className="flex gap-1">
                      {i === values.length - 1 && (
                        <PlusCircleOutlined
                          className="text-primary-8"
                          onClick={() => {
                            setValues([...values, null]);
                            onChange([...values, null]);
                          }}
                        />
                      )}
                      {values.length >= 2 && (
                        <CloseOutlined
                          className="text-primary-8"
                          onClick={() => {
                            const updated = [...values];
                            updated.splice(i, 1);
                            setValues(updated);
                            onChange(updated);
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
}
