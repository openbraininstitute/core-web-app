import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSlider } from '@/ui/molecules/slider/use-slider';

describe('useSlider commit', () => {
  it('reports a stop once, however many times the drag lands on it', () => {
    const onValueChange = vi.fn();
    const { result } = renderHook(() =>
      useSlider({ value: 1, onValueChange, min: 0, max: 10, step: 1 })
    );

    // A drag commits every frame; consecutive frames snap to the same tick.
    act(() => {
      result.current.commit(4.1);
      result.current.commit(4.2);
      result.current.commit(3.9);
    });

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(4);
  });

  it('says nothing when the commit lands on the value already held', () => {
    const onValueChange = vi.fn();
    const { result } = renderHook(() =>
      useSlider({ value: 4, onValueChange, min: 0, max: 10, step: 1 })
    );

    act(() => result.current.commit(4.2));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('reports a stop again after the value moved away and back', () => {
    const onValueChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }) => useSlider({ value, onValueChange, min: 0, max: 10, step: 1 }),
      { initialProps: { value: 4 } }
    );

    // The camera moved the value elsewhere, so 4 is news again.
    rerender({ value: 9 });
    act(() => result.current.commit(4.1));

    expect(onValueChange).toHaveBeenCalledWith(4);
  });
});
