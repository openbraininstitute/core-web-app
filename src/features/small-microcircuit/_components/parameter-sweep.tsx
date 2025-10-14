import { CloseOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { InputNumber } from 'antd';
import { useState } from 'react';

export default function ParameterSwep({
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
  onChange: (v: null | number | number[]) => void;
  disabled: boolean;
  k: string;
}) {
  const [mode, setMode] = useState<'single' | 'multiple'>(
    Array.isArray(value) ? 'multiple' : 'single'
  );

  const [singleValue, setSingleValue] = useState(Array.isArray(value) ? null : value);
  const [values, setValues] = useState(Array.isArray(value) ? value : [value]);

  if (mode === 'single' && !Array.isArray(value)) {
    return (
      <div className="flex w-full gap-1">
        <InputNumber
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
            className="text-primary-8"
            onClick={() => {
              setMode('multiple');
              onChange(values.filter((v) => v !== null));
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
                    value={v}
                    min={min}
                    max={max}
                    disabled={disabled}
                    onChange={(newValue) => {
                      const updated = [...values];
                      updated[i] = newValue;
                      setValues(updated);
                      onChange(updated.filter((_v) => _v !== null));
                    }}
                  />
                  {!disabled && (
                    <div className="flex gap-1">
                      <>
                        {i === values.length - 1 && (
                          <PlusCircleOutlined
                            className="text-primary-8"
                            onClick={() => {
                              setValues([...values, null]);
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
                              onChange(updated.filter((_v) => _v !== null));
                            }}
                          />
                        )}
                      </>
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

// Icon inside field
// if (mode === 'single' && !Array.isArray(value)) {
//     return (
//       <div className="relative">
//         <InputNumber
//           min={min}
//           max={max}
//           disabled={disabled}
//           value={value}
//           onChange={(v) => {
//             setSingleValue(v); // Update locally
//             onChange(v); // Update in the config
//           }}
//           className="w-full"
//         />

//         {!disabled && (
//           <PlusCircleOutlined
//             className="text-primary-8 absolute right-[27px] top-[10px]"
//             onClick={() => {
//               setMode('multiple');
//               onChange(values.filter((v) => v !== null));
//             }}
//           />
//         )}
//       </div>
//     );
//   }
