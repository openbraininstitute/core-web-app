import { describe, expect, it } from 'vitest';

import { ViewerSignal } from '@/features/circuit-viewer/signals';

describe('a viewer signal', () => {
  it('goes to the viewer that registered last', async () => {
    const signal = new ViewerSignal<number, number>();
    signal.register((n) => n + 1);
    signal.register((n) => n * 10);
    await expect(signal.dispatch(2)).resolves.toBe(20);
  });

  it('stays with the newer viewer when the older one lets go', async () => {
    const signal = new ViewerSignal<number, number>();
    const older = signal.register((n) => n + 1);
    const newer = signal.register((n) => n * 10);
    older();
    await expect(signal.dispatch(2)).resolves.toBe(20);
    newer();
    await expect(signal.dispatch(2)).rejects.toThrow();
  });
});
