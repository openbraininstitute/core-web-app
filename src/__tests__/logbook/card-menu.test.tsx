import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { CardMenu } from '@/features/logbook/board/rail';

const renderMenu = () => {
  const onRename = vi.fn();
  render(
    <CardMenu name="Log" onRename={onRename} onDelete={vi.fn()}>
      <button type="button">Actions for Log</button>
    </CardMenu>
  );
  const trigger = screen.getByRole('button', { name: 'Actions for Log' });
  fireEvent.keyDown(trigger, { key: 'Enter' });
  return { trigger, onRename };
};

test('Escape closes the card menu and gives focus back to its button', async () => {
  const { trigger } = renderMenu();
  const menu = screen.getByRole('menu', { name: 'Actions for Log' });
  fireEvent.keyDown(menu, { key: 'Escape' });
  expect(screen.queryByRole('menu')).toBeNull();
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});

test('choosing Rename closes the menu first, then renames', async () => {
  const { onRename } = renderMenu();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));
  expect(screen.queryByRole('menu')).toBeNull();
  await waitFor(() => expect(onRename).toHaveBeenCalledTimes(1));
});
