import { CloseOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { InputNumber } from 'antd';
import isNil from 'es-toolkit/compat/isNil';
import { useEffect, useState } from 'react';

export default function ParameterSweep({
  value,
  min,
  max,
  exclusiveMin,
  exclusiveMax,
  onChange,
  disabled,
  k,
}: {
  value: number | number[] | null;
  min: number | undefined;
  max: number | undefined;
  exclusiveMin: number | undefined;
  exclusiveMax: number | undefined;
  onChange: (v: null | number | (number | null)[]) => void;
  disabled: boolean;
  k: string;
}) {
  const [mode, setMode] = useState<'single' | 'multiple'>(
    Array.isArray(value) ? 'multiple' : 'single'
  );

  const singleValue = (() => {
    if (Array.isArray(value) && !isNil(value[0])) return value[0];
    if (!Array.isArray(value) && !isNil(value)) return value;
    return null;
  })();

  const multipleValues = (() => {
    if (Array.isArray(value)) return value;
    return [value];
  })();

  // When the AI agent updates the value we need to change the mode
  useEffect(() => {
    setMode(Array.isArray(value) ? 'multiple' : 'single');
  }, [value]);

  function error(value: number) {
    if (!isNil(min) && value < min) return `Value should be greater than or equal to ${min}`;
    if (!isNil(max) && value > max) return `Value should be less than or equal to ${max}`;
    if (!isNil(exclusiveMin) && value <= exclusiveMin)
      return `Value should be greater than ${exclusiveMin}`;
    if (!isNil(exclusiveMax) && value >= exclusiveMax)
      return `Value should be less than ${exclusiveMax}`;
  }

  if (mode === 'single' && !Array.isArray(value)) {
    const errorMessage = !isNil(value) ? error(value) : undefined;
    return (
      <div className="relative">
        <InputNumber
          controls={false}
          disabled={disabled}
          status={errorMessage ? 'error' : undefined}
          value={value}
          onChange={(v) => {
            onChange(v); // Update in the config
          }}
          className="w-full"
        />

        {errorMessage && <span className="text-red-500">{errorMessage}</span>}

        {!disabled && (
          <PlusCircleOutlined
            className="text-primary-8 absolute top-[10px] right-[8px]"
            onClick={() => {
              setMode('multiple');
              onChange(multipleValues);
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
                onChange(singleValue);
              }}
            />
          </div>
        )}
        <div className="border-neutral-2 rounded-lg border bg-white p-3">
          <div className="flex flex-col gap-1">
            {multipleValues.map((v, i) => {
              const errorMessage = !isNil(v) ? error(v) : undefined;
              return (
                <>
                  {/* biome-ignore lint/suspicious/noArrayIndexKey: <i> */}
                  <div className="flex w-full justify-between gap-1" key={k + i}>
                    <InputNumber
                      status={v === null || errorMessage ? 'error' : undefined}
                      value={v}
                      disabled={disabled}
                      onChange={(newValue) => {
                        const updated = [...multipleValues];
                        updated[i] = newValue;
                        onChange(updated);
                      }}
                    />

                    {!disabled && (
                      <div className="flex gap-1">
                        {i === multipleValues.length - 1 && (
                          <PlusCircleOutlined
                            className="text-primary-8"
                            onClick={() => {
                              onChange([...multipleValues, null]);
                            }}
                          />
                        )}
                        {multipleValues.length >= 2 && (
                          <CloseOutlined
                            className="text-primary-8"
                            onClick={() => {
                              const updated = [...multipleValues];
                              updated.splice(i, 1);
                              onChange(updated);
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                  {errorMessage && <span className="text-red-500">{errorMessage}</span>}
                </>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
}
