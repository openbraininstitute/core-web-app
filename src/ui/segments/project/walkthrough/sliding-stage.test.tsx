import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SlidingStage } from './sliding-stage';

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('sliding chapter media', () => {
  it('hands playback to the selected scene immediately and disables media that is sliding away', () => {
    const order = ['labs', 'teach', 'simulate'] as const;
    const draw = (scene: string) => <button type="button">{scene}</button>;
    const { container, rerender } = render(<SlidingStage scene="labs" order={order} draw={draw} />);
    rerender(<SlidingStage scene="simulate" order={order} draw={draw} />);
    expect(container.querySelector('[data-stage-current="true"]')).toHaveAttribute(
      'data-stage-scene',
      'simulate'
    );
    expect(container.querySelector('[data-stage-scene="labs"]')).toHaveAttribute('inert');

    // Reverse direction before the previous transition has finished.
    rerender(<SlidingStage scene="teach" order={order} draw={draw} />);
    expect(container.querySelectorAll('[data-stage-current="true"]')).toHaveLength(1);
    expect(container.querySelector('[data-stage-current="true"]')).toHaveAttribute(
      'data-stage-scene',
      'teach'
    );
    expect(container.querySelector('[data-stage-scene="simulate"]')).toHaveAttribute('inert');
  });
});
