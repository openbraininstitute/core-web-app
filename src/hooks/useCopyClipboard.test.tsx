import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCopyToClipboard } from './useCopyClipboard';

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  });
}

function removeClipboard() {
  Object.defineProperty(navigator, 'clipboard', {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

describe('useCopyToClipboard', () => {
  beforeEach(() => {
    stubClipboard(vi.fn().mockResolvedValue(undefined));
  });

  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      // jsdom did not define it originally — clean up our stub.
      // @ts-expect-error allow delete on the runtime-defined property
      delete (navigator as Navigator).clipboard;
    }
  });

  it('returns the initial tuple [null, copy, reset, false]', () => {
    const { result } = renderHook(() => useCopyToClipboard());

    expect(result.current[0]).toBeNull();
    expect(typeof result.current[1]).toBe('function');
    expect(typeof result.current[2]).toBe('function');
    expect(result.current[3]).toBe(false);
  });

  it('writes to the clipboard, resolves to true, and calls onSuccess', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);

    const onSuccess = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useCopyToClipboard({ onSuccess, onError }));

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current[1]('hello');
    });

    expect(returned).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
    expect(result.current[0]).toBe('hello');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('resolves to false and calls onError when writeText rejects', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));

    const onSuccess = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useCopyToClipboard({ onSuccess, onError }));

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current[1]('nope');
    });

    expect(returned).toBe(false);
    expect(result.current[0]).toBeNull();
    expect(result.current[3]).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('resolves to false without throwing when navigator.clipboard is undefined', async () => {
    removeClipboard();

    const { result } = renderHook(() => useCopyToClipboard());

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current[1]('x');
    });

    expect(returned).toBe(false);
    expect(result.current[0]).toBeNull();
  });

  it('reset() clears copiedText back to null after a successful copy', async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current[1]('hello');
    });
    expect(result.current[0]).toBe('hello');

    act(() => {
      result.current[2]();
    });

    expect(result.current[0]).toBeNull();
  });
});
