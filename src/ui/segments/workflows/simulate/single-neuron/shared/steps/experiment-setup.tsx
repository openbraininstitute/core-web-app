import { Form, InputNumber } from 'antd';
import { useAtom, useAtomValue } from 'jotai';
import z from 'zod';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  ExperimentalSetupConfigurationAtomFamily,
  SimulationStatus,
  simulationStatusAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import {
  getSessionKey,
  label,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import {
  ExperimentalSetupConfigurationSchema,
  type SimulationExperimentalSetupKeys,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

type Props = {
  sessionId: string;
};

type SetupInputProps = {
  id: SimulationExperimentalSetupKeys;
  text: string;
  unit?: string;
  onChange: (key: SimulationExperimentalSetupKeys, newValue: number | null) => void;
};

const CONDITIONS_FIELDS: Omit<SetupInputProps, 'onChange'>[] = [
  {
    id: 'celsius',
    text: 'Temperature',
    unit: '°C',
  },
  {
    id: 'vinit',
    text: 'Initial voltage',
    unit: 'mV',
  },
  {
    id: 'hypamp',
    text: 'Holding current',
    unit: 'nA',
  },
  {
    id: 'max_time',
    text: 'Simulation duration',
    unit: 'ms',
  },
  {
    id: 'time_step',
    text: 'Time Step',
    unit: 'ms',
  },
  {
    id: 'seed',
    text: 'seed',
  },
];

function Input({
  id,
  text,
  unit,
  validator,
  onChange,
}: SetupInputProps & { validator: z.ZodTypeAny }) {
  const breakpoint = useDefaultBreakpoint();

  return (
    <div className="flex flex-col items-start justify-center">
      {label(text, true)}
      <div className="relative flex w-full flex-row flex-nowrap items-center justify-center gap-2">
        <Form.Item
          name={id}
          rules={[
            {
              validator: async (_rule, value) => {
                try {
                  await validator.parseAsync(value);
                } catch (error) {
                  return Promise.reject(
                    error instanceof z.ZodError ? error.errors.at(0)?.message : ''
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
          className="w-full"
        >
          <InputNumber
            size={breakpoint === 'l' ? 'middle' : 'large'}
            className={cn(
              'border-neutral-2! [&_.ant-input-number-input]:text-primary-8! flex w-full items-center justify-between gap-2 rounded-sm! bg-white font-bold! [&_input]:placeholder:!font-light',
              '[&_.ant-input-number-suffix]:text-neutral-3'
            )}
            onChange={(newValue: number | null) => onChange(id, newValue)}
            suffix={unit}
          />
        </Form.Item>
      </div>
    </div>
  );
}

export function ExperimentSetup({ sessionId }: Props) {
  const [form] = Form.useForm();
  const key = getSessionKey(EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY, sessionId);
  const [state, update] = useAtom(ExperimentalSetupConfigurationAtomFamily(key));
  const simulationStatus = useAtomValue(simulationStatusAtomFamily(sessionId));

  const onChange = (id: SimulationExperimentalSetupKeys, value: number | null) => {
    try {
      update({
        ...state,
        [id]: value,
      });
    } catch (error) {
      log('error', error);
    }
  };

  return (
    <Form
      key={key}
      form={form}
      scrollToFirstError
      initialValues={state}
      layout="vertical"
      validateTrigger={['onChange']}
      name="simulation-experimental-setup-configuration"
      className="[&_.ant-form-item-explain-error]:text-sm"
      disabled={
        simulationStatus?.status === SimulationStatus.LAUNCHED ||
        simulationStatus?.status === SimulationStatus.SAVING
      }
    >
      {CONDITIONS_FIELDS.map(({ id, text, unit }) => (
        <Input
          key={id}
          validator={
            ExperimentalSetupConfigurationSchema.pick({ [id]: true } as Record<typeof id, true>)
              .shape[id] as z.ZodTypeAny
          }
          {...{
            id,
            text,
            unit,
            onChange,
          }}
        />
      ))}
    </Form>
  );
}
