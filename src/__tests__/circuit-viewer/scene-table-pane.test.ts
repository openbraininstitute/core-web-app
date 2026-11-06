import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSceneTablePaneHost } from '@/features/circuit-viewer/scene-table-pane';

describe('the host of a scene’s table pane', () => {
  it('hears what the table shows, for the pane’s bar', () => {
    const { result } = renderHook(() => useSceneTablePaneHost());
    expect(result.current.view).toBe('nodes');

    act(() => result.current.value.setView('connectivity'));

    expect(result.current.view).toBe('connectivity');
  });

  it('keeps what it hands the scene the same as the view changes', () => {
    const { result } = renderHook(() => useSceneTablePaneHost());
    const { value } = result.current;

    act(() => result.current.value.setView('connectivity'));

    expect(result.current.value).toBe(value);
  });
});
