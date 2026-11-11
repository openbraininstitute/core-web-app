import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { useShuttingSplit } from '@/features/circuit-viewer/pane-resize-handle';

import type { PaneShut } from '@/features/circuit-viewer/pane-resize-handle';

/** 600 px shared, the start pane keeping 200 and the end pane 160. */
function useSplit({ shuts = true }: { shuts?: boolean } = {}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [shut, setShut] = useState<PaneShut>(null);
  return useShuttingSplit({
    chosen,
    onChosenChange: setChosen,
    shut,
    onShutChange: shuts ? setShut : undefined,
    total: 600,
    floors: [200, 160],
    preferred: 300,
  });
}

/** A drag as the grab bar makes one: every move through the handlers it was given when pressed. */
function drag(split: ReturnType<typeof useSplit>, ...moves: number[]) {
  act(() => {
    split.onDragChange(true);
    for (const end of moves) split.onResize(end);
    split.onDragChange(false);
  });
}

describe('useShuttingSplit', () => {
  it('follows the bar while both panes keep their floors', () => {
    const { result } = renderHook(() => useSplit());
    expect(result.current.size).toBe(300);
    drag(result.current, 350, 400);
    expect(result.current).toMatchObject({ size: 400, shut: null });
  });

  it('holds a pane at its floor until it is dragged under half of it', () => {
    const { result } = renderHook(() => useSplit());
    drag(result.current, 120);
    expect(result.current).toMatchObject({ size: 160, shut: null });
    drag(result.current, 90);
    expect(result.current).toMatchObject({ size: 160, shut: null });
  });

  it('shuts the end pane under half its floor and opens it at its size from before the drag', () => {
    const { result } = renderHook(() => useSplit());
    drag(result.current, 400);
    drag(result.current, 300, 160, 120, 50);
    expect(result.current.shut).toBe('end');
    act(() => result.current.open());
    expect(result.current).toMatchObject({ size: 400, shut: null });
  });

  it('shuts the start pane once it is dragged under half its floor', () => {
    const { result } = renderHook(() => useSplit());
    drag(result.current, 450, 520);
    expect(result.current.shut).toBe('start');
    act(() => result.current.open());
    expect(result.current).toMatchObject({ size: 300, shut: null });
  });

  it('opens a shut pane again when its bar is dragged back past half its floor', () => {
    const { result } = renderHook(() => useSplit());
    drag(result.current, 40);
    expect(result.current.shut).toBe('end');
    drag(result.current, 60, 100);
    expect(result.current).toMatchObject({ size: 160, shut: null });
  });

  it('only stops at the floors when the host does not shut panes', () => {
    const { result } = renderHook(() => useSplit({ shuts: false }));
    drag(result.current, 10);
    expect(result.current).toMatchObject({ size: 160, shut: null });
    drag(result.current, 590);
    expect(result.current).toMatchObject({ size: 400, shut: null });
  });
});
