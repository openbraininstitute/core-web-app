import { fireEvent, render, screen } from '@testing-library/react';
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
});
