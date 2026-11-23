import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { RenameField } from '@/features/logbook/board/rail';

test('Enter saves the new name once, even when the field then loses focus', () => {
  const onSave = vi.fn();
  render(<RenameField name="Old" label="Name" onSave={onSave} onCancel={vi.fn()} />);
  const field = screen.getByLabelText('Name');
  fireEvent.change(field, { target: { value: 'New' } });
  fireEvent.keyDown(field, { key: 'Enter' });
  field.blur();
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(onSave).toHaveBeenCalledWith('New');
});
