'use client';

import { DatePicker, Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import dayjs from 'dayjs';
import { match } from 'ts-pattern';

import { dateTimeItemProps, lockWhilePending } from './form-props';

import type { Rule, RuleObject } from 'antd/es/form';
import type { ReactNode } from 'react';

export type FormModalField = {
  name: string;
  label: string;
  kind?: 'multiline' | 'integer' | 'amount' | 'switch' | 'select' | 'datetime';
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  placeholder?: string;
  extra?: ReactNode;
  rules?: Rule[];
  // Fields whose value a rule here reads, so a change there checks this one again.
  dependencies?: string[];
};

const fieldControl = ({ kind, min, max, options, placeholder }: FormModalField) =>
  match(kind)
    .with('multiline', () => <Input.TextArea rows={3} />)
    .with('integer', () => (
      <InputNumber min={min} max={max} precision={0} placeholder={placeholder} className="w-full" />
    ))
    .with('amount', () => (
      <InputNumber<string> stringMode min="0" placeholder={placeholder} className="w-full" />
    ))
    .with('switch', () => <Switch />)
    .with('select', () => <Select showSearch optionFilterProp="label" options={options} />)
    .with('datetime', () => <DatePicker showTime className="w-full" />)
    .otherwise(() => <Input placeholder={placeholder} />);

export const REQUIRED = { required: true, message: 'Required' };

export const NAME_FIELD: FormModalField = {
  name: 'name',
  label: 'Name',
  rules: [{ required: true, whitespace: true, message: 'Give it a name' }, { max: 250 }],
};

export const DESCRIPTION_FIELD: FormModalField = {
  name: 'description',
  label: 'Description',
  kind: 'multiline',
};

export const typedNameField = (name: string, what: string): FormModalField => ({
  name: 'name',
  label: `Type the ${what}'s name to confirm`,
  rules: [
    {
      validator: async (_, value) => {
        if (value !== name) throw new Error(`That isn't the ${what}'s name`);
      },
    },
  ],
});

// Dates are the API's ISO strings, as the datetime field holds them.
export const afterDate = (earlier: string | undefined, label: string): RuleObject => ({
  validator: async (_, value?: string) => {
    if (value && earlier && !dayjs(value).isAfter(earlier)) {
      throw new Error(`Has to be after the ${label}`);
    }
  },
});

// Edits, reasons and typed confirmations are all a short form in a modal. It stays mounted
// only while open, so `initialValues` are always the current ones.
export function FormModal<Values extends Record<string, unknown>>({
  title,
  description,
  fields,
  initialValues,
  okText,
  danger,
  pending,
  onSubmit,
  onClose,
}: {
  title: string;
  description?: ReactNode;
  fields: FormModalField[];
  initialValues?: Partial<Values>;
  okText: string;
  danger?: boolean;
  pending: boolean;
  onSubmit: (values: Values) => void;
  onClose: () => void;
}) {
  const [form] = Form.useForm<Values>();

  return (
    <Modal
      open
      title={title}
      okText={okText}
      okButtonProps={{ danger }}
      confirmLoading={pending}
      onOk={() => form.submit()}
      {...lockWhilePending(pending, onClose)}
      cancelButtonProps={{ disabled: pending }}
    >
      {description && <div className="text-neutral-4 mb-4">{description}</div>}
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={initialValues}
        // Enter submits a form too, and the disabled OK button doesn't stop that.
        onFinish={(values) => {
          if (!pending) onSubmit(values);
        }}
      >
        {fields.map((field) => (
          // Form.Item's own `extra` shifts the form when a field first shows an error.
          <div key={field.name} className="mb-6">
            <Form.Item
              name={field.name}
              label={field.label}
              rules={field.rules}
              dependencies={field.dependencies}
              valuePropName={field.kind === 'switch' ? 'checked' : 'value'}
              {...(field.kind === 'datetime' && dateTimeItemProps)}
              style={{ marginBottom: 0 }}
            >
              {fieldControl(field)}
            </Form.Item>
            {field.extra && <div className="text-neutral-4 mt-1 text-sm">{field.extra}</div>}
          </div>
        ))}
      </Form>
    </Modal>
  );
}
