'use client';

import { Form, Input, Modal } from 'antd';

import type { Rule } from 'antd/es/form';
import type { ReactNode } from 'react';

export type FormModalField = {
  name: string;
  label: string;
  multiline?: boolean;
  rules?: Rule[];
};

// Edits, reasons and typed confirmations are all a short form in a modal. It stays mounted
// only while open, so `initialValues` are always the current ones.
export function FormModal<Values extends Record<string, string | undefined>>({
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
        {fields.map(({ name, label, multiline, rules }) => (
          <Form.Item key={name} name={name} label={label} rules={rules}>
            {multiline ? <Input.TextArea rows={3} /> : <Input />}
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
}
