import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useOnClickOutside } from './useOnClickOutside';

function dispatch(type: string, target: EventTarget) {
  const evt = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(evt, 'target', { value: target });
  document.dispatchEvent(evt);
  return evt;
}

describe('useOnClickOutside', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('fires the callback when a mousedown happens outside the ref element', () => {
    const outer = document.createElement('div');
    const sibling = document.createElement('div');
    document.body.append(outer, sibling);

    const ref = { current: outer };
    const onClickAway = vi.fn();
    renderHook(() => useOnClickOutside(ref, onClickAway));

    dispatch('mousedown', sibling);

    expect(onClickAway).toHaveBeenCalledTimes(1);
  });

  it('does not fire when the event target is inside the ref element', () => {
    const outer = document.createElement('div');
    const inner = document.createElement('span');
    outer.appendChild(inner);
    document.body.appendChild(outer);

    const ref = { current: outer };
    const onClickAway = vi.fn();
    renderHook(() => useOnClickOutside(ref, onClickAway));

    dispatch('mousedown', inner);

    expect(onClickAway).not.toHaveBeenCalled();
  });

  it('detaches the listener on unmount', () => {
    const outer = document.createElement('div');
    const sibling = document.createElement('div');
    document.body.append(outer, sibling);

    const ref = { current: outer };
    const onClickAway = vi.fn();
    const { unmount } = renderHook(() => useOnClickOutside(ref, onClickAway));

    unmount();
    dispatch('mousedown', sibling);

    expect(onClickAway).not.toHaveBeenCalled();
  });

  it('honors a custom events array', () => {
    const outer = document.createElement('div');
    const sibling = document.createElement('div');
    document.body.append(outer, sibling);

    const ref = { current: outer };
    const onClickAway = vi.fn();
    renderHook(() => useOnClickOutside(ref, onClickAway, ['click']));

    dispatch('mousedown', sibling);
    expect(onClickAway).not.toHaveBeenCalled();

    dispatch('click', sibling);
    expect(onClickAway).toHaveBeenCalledTimes(1);
  });

  it('skips the callback when the ignore predicate returns true', () => {
    const outer = document.createElement('div');
    const sibling = document.createElement('div');
    document.body.append(outer, sibling);

    const ref = { current: outer };
    const onClickAway = vi.fn();
    renderHook(() => useOnClickOutside(ref, onClickAway, undefined, () => true));

    dispatch('mousedown', sibling);

    expect(onClickAway).not.toHaveBeenCalled();
  });
});
