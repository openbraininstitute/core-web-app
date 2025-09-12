import { Form, InputNumber } from 'antd';

import type {
  UpdateSynapseSimulationProperty,
  SynapseConfig,
} from '@/types/small-scale-simulator/single-neuron';

const SYNAPTIC_INPUT_FIELDS: Array<Omit<ConfigInputProps, 'onChange' | 'index' | 'formName'>> = [
  {
    name: 'delay',
    text: 'Delay',
    unit: 'ms',
    min: 0,
    max: Infinity,
  },
  {
    name: 'duration',
    text: 'duration',
    unit: 'ms',
    min: 0,
    max: 3000,
  },
  {
    name: 'weight_scalar',
    text: 'Weight scalar',
    min: 0.001,
    max: 1000,
  },
];

type ConfigInputProps = {
  index: number;
  formName: string;
  name: keyof SynapseConfig;
  text: string;
  unit?: string;
  min: number;
  max: number;
  onChange: (change: UpdateSynapseSimulationProperty) => void;
};

function ConfigInput({ formName, name, text, min, max, index, unit, onChange }: ConfigInputProps) {
  return (
    <div className="flex flex-col items-start justify-start">
      <div className="text-neutral-4 mb-2 text-left text-base font-light uppercase">
        {text} {unit && <span className="normal-case">[{unit}]</span>}
      </div>
      <Form.Item name={[formName, name]} rules={[{ required: true, message: 'Required field' }]}>
        <InputNumber
          className="border-neutral-4! [&_.ant-input-number-input]:text-primary-8! w-full rounded-xs! border font-bold [&_.ant-input-number-input]:text-base!"
          min={min}
          max={max}
          onChange={(newValue) =>
            onChange({
              id: index,
              key: name,
              newValue,
            })
          }
        />
      </Form.Item>
    </div>
  );
}

type Props = {
  index: number;
  formName: string;
  onChange: (change: UpdateSynapseSimulationProperty) => void;
};

export default function ConfigInputList({ index, formName, onChange }: Props) {
  return (
    <div className="grid grid-flow-col items-center gap-4">
      {SYNAPTIC_INPUT_FIELDS.map(({ name, text, min, max, unit }) => (
        <ConfigInput
          key={`config-${formName}-${index}-${name}`}
          {...{
            formName,
            index,
            name,
            text,
            min,
            max,
            unit,
            onChange,
          }}
        />
      ))}
    </div>
  );
}
