import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { EditorTabs } from '@/features/logbook/log/editor-tabs';
import { TabKind } from '@/features/logbook/types';

import type { IEditorTab } from '@/features/logbook/types';

const tab = (id: string, pinned = false, onRename: IEditorTab['onRename'] = null): IEditorTab => ({
  tab: { kind: TabKind.Page, id },
  label: `Page ${id}`,
  hint: id,
  icon: null,
  pinned,
  onRename,
});

const renderTabs = (tabs: readonly IEditorTab[], onSelect = vi.fn()) =>
  render(
    <EditorTabs
      tabs={tabs}
      active={tabs[0]?.tab ?? { kind: TabKind.Page, id: 'main' }}
      page={tabs[0]?.tab ?? { kind: TabKind.Page, id: 'main' }}
      status={null}
      onSelect={onSelect}
      onClose={vi.fn()}
    />
  );

test('a double click on a page tab opens its name field; Enter saves the new name', () => {
  const onRename = vi.fn(async () => {});
  renderTabs([tab('main', true), tab('a', false, onRename)]);
  const [, a] = screen.getAllByTestId('logbook-tab');
  fireEvent.doubleClick(screen.getByText('Page a'));
  const field = screen.getByRole('textbox', { name: 'Name of the page' });
  expect(document.activeElement).toBe(field);
  fireEvent.change(field, { target: { value: 'Results' } });
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(onRename).toHaveBeenCalledWith('Results');
  expect(document.activeElement).toBe(a);
  expect(screen.queryByRole('textbox', { name: 'Name of the page' })).toBeNull();
});

test('F2 opens the name field; a tab without rename (a file, read-only) never does', () => {
  renderTabs([
    tab('main', true),
    tab(
      'a',
      false,
      vi.fn(async () => {})
    ),
    tab('b'),
  ]);
  const [, a, b] = screen.getAllByTestId('logbook-tab');
  fireEvent.doubleClick(b as HTMLElement);
  expect(screen.queryByRole('textbox')).toBeNull();
  fireEvent.keyDown(a as HTMLElement, { key: 'F2' });
  expect(screen.getByRole('textbox', { name: 'Name of the page' })).toBeDefined();
});

test('arrow keys move between tabs, Home and End jump to the ends, Enter opens', () => {
  const onSelect = vi.fn();
  const tabs = [tab('main', true), tab('a'), tab('b')];
  renderTabs(tabs, onSelect);
  const [main, a, b] = screen.getAllByTestId('logbook-tab');
  main?.focus();
  fireEvent.keyDown(main as HTMLElement, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(a);
  fireEvent.keyDown(a as HTMLElement, { key: 'End' });
  expect(document.activeElement).toBe(b);
  fireEvent.keyDown(b as HTMLElement, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(main);
  fireEvent.keyDown(main as HTMLElement, { key: 'ArrowLeft' });
  expect(document.activeElement).toBe(b);
  fireEvent.keyDown(b as HTMLElement, { key: 'Home' });
  expect(document.activeElement).toBe(main);
  fireEvent.keyDown(main as HTMLElement, { key: 'ArrowRight' });
  fireEvent.keyDown(a as HTMLElement, { key: 'Enter' });
  expect(onSelect).toHaveBeenCalledWith({ kind: TabKind.Page, id: 'a' });
});
