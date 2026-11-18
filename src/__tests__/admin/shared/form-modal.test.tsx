import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FormModal } from '@/admin/shared/form-modal';

function renderModal(pending: boolean) {
  const onClose = vi.fn();
  render(
    <FormModal
      title="Cancel this subscription?"
      fields={[]}
      okText="Confirm"
      pending={pending}
      onSubmit={vi.fn()}
      onClose={onClose}
    />
  );
  return onClose;
}

describe('FormModal', () => {
  it('closes with Esc or Cancel while idle', () => {
    const onClose = renderModal(false);
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', keyCode: 27 });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('stays open while its save is pending', () => {
    const onClose = renderModal(true);
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancel' }).hasAttribute('disabled')).toBe(true);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', keyCode: 27 });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('submits a switch as the boolean it shows', async () => {
    const onSubmit = vi.fn();
    render(
      <FormModal<{ active: boolean }>
        title="Edit plan"
        fields={[{ name: 'active', label: 'Active', kind: 'switch' }]}
        initialValues={{ active: true }}
        okText="Save"
        pending={false}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ active: false }));
  });
});
