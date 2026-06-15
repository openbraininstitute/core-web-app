import { useState } from 'react';

import { Button } from '@/ui/molecules/button';
import { Checkbox } from '@/ui/molecules/checkbox';
import { DatePicker } from '@/ui/molecules/date-picker';
import { Field, Form, useForm } from '@/ui/molecules/form';
import { Input } from '@/ui/molecules/input';
import { InputNumber } from '@/ui/molecules/input-number';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Form',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

type WorkspaceValues = {
  name: string;
  region: string;
  members: number;
  startDate: string;
  isPublic: boolean;
};

function WorkspaceForm() {
  const [submitted, setSubmitted] = useState<WorkspaceValues | null>(null);

  const form = useForm<WorkspaceValues>({
    defaultValues: {
      name: '',
      region: '',
      members: 1,
      startDate: '',
      isPublic: false,
    },
    validateOn: 'blur',
    validate: (values) => {
      const errors: Partial<Record<keyof WorkspaceValues, string>> = {};
      if (!values.name.trim()) errors.name = 'Name is required';
      if (!values.region) errors.region = 'Pick a region';
      if (values.members < 1) errors.members = 'Need at least 1 member';
      if (!values.startDate) errors.startDate = 'Pick a start date';
      return errors;
    },
  });

  return (
    <div className="w-[480px] space-y-4">
      <Form form={form} onSubmit={setSubmitted}>
        <Field name="name" label="Workspace name">
          {({ id, value, onChange, onBlur, invalid }) => (
            <Input
              id={id}
              placeholder="My research workspace"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
              aria-invalid={invalid}
            />
          )}
        </Field>

        <Field name="region" label="Brain region">
          {({ value, onChange }) => (
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ca1">CA1</SelectItem>
                <SelectItem value="ca3">CA3</SelectItem>
                <SelectItem value="cortex">Somatosensory cortex</SelectItem>
                <SelectItem value="thalamus">Thalamus</SelectItem>
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field name="members" label="Members" hint="Includes you.">
          {({ value, onChange }) => (
            <InputNumber value={value} onChange={onChange} min={1} max={50} />
          )}
        </Field>

        <Field name="startDate" label="Start date">
          {({ value, onChange }) => <DatePicker value={value} onChange={onChange} />}
        </Field>

        <Field name="isPublic">
          {({ id, value, onChange }) => (
            <label htmlFor={id} className="flex items-center gap-2 text-sm">
              <Checkbox id={id} checked={value} onCheckedChange={(c) => onChange(c === true)} />
              Make workspace discoverable
            </label>
          )}
        </Field>

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={form.isSubmitting}>
            {form.isSubmitting ? 'Saving…' : 'Create workspace'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => form.reset()}>
            Reset
          </Button>
        </div>
      </Form>

      {submitted && (
        <pre className="bg-neutral-1 border-neutral-2 rounded-md border p-3 text-xs">
          {JSON.stringify(submitted, null, 2)}
        </pre>
      )}
    </div>
  );
}

export const WorkspaceCreate: Story = {
  render: () => <WorkspaceForm />,
};

type LoginValues = { email: string; password: string };

function LoginForm() {
  const form = useForm<LoginValues>({
    defaultValues: { email: '', password: '' },
    validateOn: 'submit',
    validate: (values) => {
      const errors: Partial<Record<keyof LoginValues, string>> = {};
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) errors.email = 'Enter a valid email';
      if (values.password.length < 8) errors.password = 'Min 8 characters';
      return errors;
    },
  });

  return (
    <div className="w-80">
      <Form form={form} onSubmit={(v) => console.log('login', v)}>
        <Field name="email" label="Email">
          {({ id, value, onChange, onBlur, invalid }) => (
            <Input
              id={id}
              type="email"
              placeholder="you@example.com"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
              aria-invalid={invalid}
            />
          )}
        </Field>
        <Field name="password" label="Password">
          {({ id, value, onChange, onBlur, invalid }) => (
            <Input
              id={id}
              type="password"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
              aria-invalid={invalid}
            />
          )}
        </Field>
        <Button type="submit">Sign in</Button>
      </Form>
    </div>
  );
}

export const SimpleLogin: Story = { render: () => <LoginForm /> };
