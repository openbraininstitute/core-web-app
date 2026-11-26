import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { StackedPanes } from '@/features/spike-viewer/spike-statistics/stacked-panes';
import { StackedSplit } from '@/features/spike-viewer/types';

import type { TStackedSplit } from '@/features/spike-viewer/types';

afterEach(() => vi.restoreAllMocks());

function Panes({ name, split }: { name: string; split: TStackedSplit }) {
  return (
    <StackedPanes
      split={split}
      top={{ title: '3D View', content: <p>{`view ${name}`}</p> }}
      bottom={{ title: 'Table', content: <p>{`table ${name}`}</p> }}
    />
  );
}

const tableHeight = (name: string) => screen.getByText(`table ${name}`).parentElement?.style.height;

test('dragging one isolated split leaves the other isolated split and the configuration where they were', () => {
  // Every pane area 600px tall, so each split has room for its bar to move.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top: 0,
    bottom: 600,
    height: 600,
  } as DOMRect);
  const { container } = render(
    <>
      <Panes name="a" split={StackedSplit.Isolated} />
      <Panes name="b" split={StackedSplit.Isolated} />
      <Panes name="config" split={StackedSplit.Config} />
    </>
  );
  // Half each until dragged: 300 for the table's room, less the 12px gutter.
  expect([tableHeight('a'), tableHeight('b'), tableHeight('config')]).toEqual([
    '288px',
    '288px',
    '288px',
  ]);

  const [firstBar] = container.querySelectorAll('.cursor-ns-resize');
  fireEvent.pointerDown(firstBar, { button: 0, pointerId: 1 });
  act(() => {
    window.dispatchEvent(new MouseEvent('pointermove', { buttons: 1, clientY: 250 }));
    window.dispatchEvent(new MouseEvent('pointerup'));
  });

  expect(tableHeight('a')).toBe('338px');
  expect(tableHeight('b')).toBe('288px');
  expect(tableHeight('config')).toBe('288px');
});
