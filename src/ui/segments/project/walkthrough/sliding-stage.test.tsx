import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SlidingStage } from './sliding-stage';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
  it('pauses offscreen videos instead of leaving adjacent chapters autoplaying', () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const draw = () => <video autoPlay muted playsInline />;
    const { container, rerender } = render(
      <SlidingStage scene="labs" active={false} draw={draw} />
    );
    const video = container.querySelector('video');
    expect(video?.autoplay).toBe(false);
    expect(pause).toHaveBeenCalledOnce();
    rerender(<SlidingStage scene="labs" active draw={draw} />);
    expect(video?.autoplay).toBe(true);
    rerender(<SlidingStage scene="labs" active={false} draw={draw} />);
    expect(video?.autoplay).toBe(false);
    expect(pause).toHaveBeenCalledTimes(2);
  });
});
