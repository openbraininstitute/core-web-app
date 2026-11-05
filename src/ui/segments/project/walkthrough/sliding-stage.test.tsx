import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SlidingStage } from './sliding-stage';

afterEach(cleanup);

describe('sliding chapter media', () => {
  it('hands playback and interaction to the current chapter while retaining its neighbour', () => {
    const draw = (scene: string) => <button type="button">{scene}</button>;
    const pair = (active: string) => (
      <>
        <SlidingStage scene="labs" active={active === 'labs'} draw={draw} />
        <SlidingStage scene="teach" active={active === 'teach'} draw={draw} />
      </>
    );
    const { container, rerender } = render(pair('labs'));
    const labs = container.querySelector('[data-stage-scene="labs"]');
    const teach = container.querySelector('[data-stage-scene="teach"]');
    expect(labs).not.toHaveAttribute('inert');
    expect(teach).toHaveAttribute('inert');
    rerender(pair('teach'));
    expect(container.querySelector('[data-stage-scene="labs"]')).toBe(labs);
    expect(container.querySelector('[data-stage-current="true"]')).toBe(teach);
    expect(labs).toHaveAttribute('inert');
    expect(teach).not.toHaveAttribute('inert');
    rerender(pair('labs'));
    expect(container.querySelector('[data-stage-current="true"]')).toBe(labs);
  });
});
