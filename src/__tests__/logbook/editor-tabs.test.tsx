import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { EditorTabs } from '@/features/logbook/log/editor-tabs';
import { TabKind } from '@/features/logbook/log/open-tabs';

import type { IEditorTab } from '@/features/logbook/log/editor-tabs';

const tab = (id: string, pinned = false): IEditorTab => ({
  tab: { kind: TabKind.Page, id },
  label: `Page ${id}`,
  hint: id,
  icon: null,
  pinned,
});

test('arrow keys move between tabs, Home and End jump to the ends, Enter opens', () => {
  const onSelect = vi.fn();
  const tabs = [tab('main', true), tab('a'), tab('b')];
  render(
    <EditorTabs
      tabs={tabs}
      active={tabs[0]?.tab ?? { kind: TabKind.Page, id: 'main' }}
      page={tabs[0]?.tab ?? { kind: TabKind.Page, id: 'main' }}
      status={null}
      canRename={false}
      onRename={async () => {}}
      onSelect={onSelect}
      onClose={vi.fn()}
    />
  );
  const [main, a, b] = screen.getAllByTestId('logbook-tab');
  main?.focus();
  fireEvent.keyDown(main as HTMLElement, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(a);
  fireEvent.keyDown(a as HTMLElement, { key: 'End' });
  expect(document.activeElement).toBe(b);
  fireEvent.keyDown(b as HTMLElement, { key: 'ArrowRight' }); // wraps
  expect(document.activeElement).toBe(main);
  fireEvent.keyDown(main as HTMLElement, { key: 'ArrowLeft' });
  expect(document.activeElement).toBe(b);
  fireEvent.keyDown(b as HTMLElement, { key: 'Home' });
  expect(document.activeElement).toBe(main);
  fireEvent.keyDown(main as HTMLElement, { key: 'ArrowRight' });
  fireEvent.keyDown(a as HTMLElement, { key: 'Enter' });
  expect(onSelect).toHaveBeenCalledWith({ kind: TabKind.Page, id: 'a' });
});
