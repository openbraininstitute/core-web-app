'use client';

import { DatePicker, Form, Input, InputNumber, Modal, Select, Switch } from 'antd';

import type { Rule } from 'antd/es/form';
import type { ReactNode } from 'react';

export type FormModalField = {
  name: string;
  label: string;
  kind?: 'text' | 'multiline' | 'integer' | 'switch' | 'select' | 'datetime';
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  placeholder?: string;
  extra?: ReactNode;
  rules?: Rule[];
};

function fieldControl({ kind = 'text', min, max, options, placeholder }: FormModalField) {
  switch (kind) {
    case 'multiline':
      return <Input.TextArea rows={3} placeholder={placeholder} />;
    case 'integer':
      return (
        <InputNumber
          min={min}
          max={max}
          precision={0}
          placeholder={placeholder}
          className="w-full"
        />
      );
    case 'switch':
      return <Switch />;
    case 'select':
      return <Select showSearch optionFilterProp="label" options={options} />;
    case 'datetime':
      return <DatePicker showTime className="w-full" />;
    default:
      return <Input placeholder={placeholder} />;
  }
}

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
      onCancel={onClose}
    >
      {description && <div className="text-neutral-4 mb-4">{description}</div>}
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={initialValues}
        onFinish={onSubmit}
      >
        {fields.map((field) => (
          // Form.Item's own `extra` makes the form jump when a field is first touched.
          <div key={field.name} className="mb-6">
            <Form.Item
              name={field.name}
              label={field.label}
              rules={field.rules}
              valuePropName={field.kind === 'switch' ? 'checked' : 'value'}
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
