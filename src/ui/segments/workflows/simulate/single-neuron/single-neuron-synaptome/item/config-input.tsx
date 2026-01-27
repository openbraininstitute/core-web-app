import { Form, InputNumber } from 'antd';
import type {
  SynapseConfig,
  UpdateSynapseSimulationProperty,
} from '@/types/small-scale-simulator/single-neuron';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { label } from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import { cn } from '@/utils/css-class';

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
  const breakpoint = useDefaultBreakpoint();
  return (
    <div className="flex flex-col items-start justify-start">
      <Form.Item
        label={label(text, true)}
        name={[formName, name]}
        rules={[{ required: true, message: 'Required field' }]}
      >
        <InputNumber
          size={breakpoint === 'l' ? 'middle' : 'large'}
          className={cn(
            'border-neutral-2! [&_.ant-input-number-input]:text-primary-8! flex w-full items-center justify-between gap-2 rounded-sm! bg-white font-bold! [&_input]:placeholder:!font-light',
            '[&_.ant-input-number-suffix]:text-neutral-3 [&_.ant-input-number-suffix]:pointer-events-auto'
          )}
          min={min}
          max={max}
          onChange={(newValue) =>
            onChange({
              id: index,
              key: name,
              newValue,
            })
          }
          suffix={unit && <span className="normal-case">[{unit}]</span>}
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

export function ConfigInputList({ index, formName, onChange }: Props) {
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
