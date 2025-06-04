import { useAtom } from 'jotai';
import { useParams } from 'next/navigation';

import { Form, Input, InputNumber, Select } from 'antd';
import { z } from 'zod';
import { SimulationsForm, Params, Initialize, InitializeSchema } from './types';
import { getErrorsAtom, getInitializationAtom } from './state';

export function Label({ children, unit }: { children: React.ReactNode; unit?: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-primary-8 font-semibold uppercase">{children}</span>
      {unit && <span className="text-gray-400"> {unit}</span>}
    </div>
  );
}

export function InitializeForm() {
  const [form] = Form.useForm();

  const nodeSetOptions = ['node_set1', 'node_set2'];
  const { circuit_id } = useParams<Params>(); // eslint-disable-line @typescript-eslint/naming-convention
  const [initAtom, setInitAtom] = useAtom(getInitializationAtom(circuit_id));
  const [, setErrors] = useAtom(getErrorsAtom(circuit_id));

  const validateWithZod = (fieldName: keyof Initialize) => async (_rule: any, value: any) => {
    try {
      const pickObj = { [fieldName]: true };

      InitializeSchema.pick(pickObj as { [key in keyof Initialize]: true }).parse({
        [fieldName]: value,
      });

      return Promise.resolve();
    } catch (e) {
      if (e instanceof z.ZodError) {
        return Promise.reject(new Error(e.errors[0].message));
      }
      return Promise.reject(new Error('Validation error'));
    }
  };

  const onValuesChange = (_: any, allValues: any) => {
    const dataToValidate = {
      type: 'SimulationsForm.Initialize',
      circuit_id,
      ...allValues,
    };

    if (!InitializeSchema.safeParse(dataToValidate).success) {
      setErrors(true);
    } else {
      setErrors(false);
    }

    setInitAtom(dataToValidate);
  };

  return (
    <Form form={form} layout="vertical" onValuesChange={onValuesChange}>
      <Form.Item label={<Label>Circuit ID</Label>}>
        <Input value={circuit_id} readOnly />
      </Form.Item>

      <Form.Item
        label={<Label unit="ms">Simulation Length</Label>}
        name="simulation_length"
        rules={[{ validator: validateWithZod('simulation_length') }]}
        required
      >
        <InputNumber style={{ width: '100%' }} min={1} />
      </Form.Item>

      <Form.Item
        label={<Label>Node Set</Label>}
        name="node_set"
        rules={[{ validator: validateWithZod('node_set') }]}
        required
      >
        <Select placeholder="Select node set" allowClear>
          {nodeSetOptions.map((id: string) => (
            <Select.Option key={id} value={id}>
              {id}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      {/* repeat for other fields similarly */}

      <Form.Item
        label={<Label>Random Seed</Label>}
        name="random_seed"
        rules={[{ validator: validateWithZod('random_seed') }]}
        required
      >
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        label={<Label unit="mM">Extracellular Calcium Concentration</Label>}
        name="extracellular_calcium_concentration"
        rules={[{ validator: validateWithZod('extracellular_calcium_concentration') }]}
        required
      >
        <InputNumber style={{ width: '100%' }} step={0.01} />
      </Form.Item>

      <Form.Item
        label={<Label>V Init</Label>}
        name="v_init"
        rules={[{ validator: validateWithZod('v_init') }]}
        required
      >
        <InputNumber style={{ width: '100%' }} step={0.01} />
      </Form.Item>

      <Form.Item
        label={<Label>Spike Location</Label>}
        name="spike_location"
        rules={[{ validator: validateWithZod('spike_location') }]}
        required
      >
        <Input />
      </Form.Item>

      <Form.Item
        label={<Label>Sonata Version</Label>}
        name="sonata_version"
        rules={[{ validator: validateWithZod('sonata_version') }]}
        required
      >
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        label={<Label>Target Simulator</Label>}
        name="target_simulator"
        rules={[{ validator: validateWithZod('target_simulator') }]}
        required
      >
        <Input />
      </Form.Item>

      <Form.Item
        label={<Label>Timestep</Label>}
        name="timestep"
        rules={[{ validator: validateWithZod('timestep') }]}
        required
      >
        <InputNumber style={{ width: '100%' }} step={0.001} min={0} />
      </Form.Item>
    </Form>
  );
}
