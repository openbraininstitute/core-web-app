'use client';

import { DatePicker, Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import dayjs from 'dayjs';

import type { Rule } from 'antd/es/form';
import type { Dayjs } from 'dayjs';
import type { ReactNode } from 'react';

type FormModalField = {
  name: string;
  label: string;
  kind?: 'multiline' | 'integer' | 'switch' | 'select' | 'datetime';
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  placeholder?: string;
  extra?: ReactNode;
  rules?: Rule[];
  // Fields whose value a rule here reads, so a change there checks this one again.
  dependencies?: string[];
};

function fieldControl({ kind, min, max, options, placeholder }: FormModalField) {
  switch (kind) {
    case 'multiline':
      return <Input.TextArea rows={3} />;
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
      return <Select options={options} />;
    case 'datetime':
      return <DatePicker showTime className="w-full" />;
    default:
      return <Input />;
  }
}

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
      // A save in flight finishes in this dialog, so nothing closes it until then.
      onCancel={() => {
        if (!pending) onClose();
      }}
      closable={!pending}
      maskClosable={!pending}
      keyboard={!pending}
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
              // A date is held as the API's ISO string, so an untouched one compares equal.
              {...(field.kind === 'datetime' && {
                getValueProps: (value?: string) => ({ value: value ? dayjs(value) : undefined }),
                normalize: (date?: Dayjs | null) => date?.toISOString(),
              })}
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
