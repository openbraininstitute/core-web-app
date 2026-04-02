import { render, screen } from '@testing-library/react';
import { Form } from 'antd';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { LocationFields } from './location-fields';

function TestLocationFields() {
  const [form] = Form.useForm();

  return (
    <Form form={form} initialValues={{ setup: { location: {} } }}>
      <LocationFields
        schema={z.object({
          setup: z.object({
            location: z.object({
              x: z.number().nullish(),
              y: z.number().nullish(),
              z: z.number().nullish(),
            }),
          }),
        })}
        form={form}
      />
    </Form>
  );
}

describe('LocationFields', () => {
  it('renders a full-width row with the three coordinate inputs', () => {
    render(<TestLocationFields />);

    const group = screen.getByRole('group', { name: 'Location coordinates' });

    expect(group).toHaveClass('w-full');
    expect(screen.getAllByRole('spinbutton')).toHaveLength(3);
  });
});
