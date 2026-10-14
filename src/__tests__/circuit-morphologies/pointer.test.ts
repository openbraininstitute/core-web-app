// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { trackPointer } from '@/features/circuit-viewer/morphologies/pointer';

/** The view's part: each pick waits to be answered. */
function fakeView() {
  const answers: ((cell: number | null) => void)[] = [];
  return {
    answers,
    pick: vi.fn((_x: number, _y: number) => new Promise<number | null>((r) => answers.push(r))),
    setHighlight: vi.fn((_cell: number | null) => {}),
    moving: false,
  };
}

let element: HTMLElement;
let stop: (() => void) | undefined;

function track(options: { hover: boolean; onClick?: (cell: number) => void }) {
  const view = fakeView();
  stop = trackPointer(element, view, options);
  return view;
}

const pointer = (type: string, at: [number, number], init: PointerEventInit = {}) =>
  element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      isPrimary: true,
      pointerId: 1,
      clientX: at[0],
      clientY: at[1],
      ...init,
    })
  );
const press = (at: [number, number]) => pointer('pointerdown', at, { buttons: 1 });
const click = (at: [number, number]) => {
  press(at);
  pointer('pointerup', at);
};
/** The pointer comes to rest at 50, 50 in the view, as long as a pick waits for. */
const rest = () => {
  pointer('pointermove', [150, 90]);
  vi.advanceTimersByTime(60);
};
const answer = async (view: ReturnType<typeof fakeView>, cell: number | null) => {
  view.answers.shift()?.(cell);
  await Promise.resolve();
};

beforeEach(() => {
  vi.useFakeTimers();
  element = document.body.appendChild(document.createElement('div'));
  // The view starts 100 pixels across and 40 down the page.
  element.getBoundingClientRect = () => ({ left: 100, top: 40 }) as DOMRect;
});

afterEach(() => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('the pointer over the morphologies', () => {
  it('highlights the cell it rests on, looked for where it is in the view', async () => {
    const view = track({ hover: true });

    pointer('pointermove', [130, 60]);
    pointer('pointermove', [150, 90]);
    vi.advanceTimersByTime(59);
    expect(view.pick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(view.pick).toHaveBeenCalledExactlyOnceWith(50, 50);

    await answer(view, 7);
    expect(view.setHighlight).toHaveBeenCalledExactlyOnceWith(7);
  });

  it('highlights none where it rests on none', async () => {
    const view = track({ hover: true });
    rest();

    await answer(view, null);

    expect(view.setHighlight).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('lets go of an answer that comes once it has moved on', async () => {
    const view = track({ hover: true });
    rest();
    pointer('pointermove', [160, 90]);

    await answer(view, 7);

    expect(view.setHighlight).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60);
    expect(view.pick).toHaveBeenLastCalledWith(60, 50);
  });

  it('asks for one pick at a time, and the next once the first is answered', async () => {
    const view = track({ hover: true });
    rest();
    pointer('pointermove', [160, 90]);
    vi.advanceTimersByTime(200);
    expect(view.pick).toHaveBeenCalledTimes(1);

    await answer(view, 7);
    vi.advanceTimersByTime(60);

    expect(view.pick).toHaveBeenCalledTimes(2);
    expect(view.pick).toHaveBeenLastCalledWith(60, 50);
    await answer(view, 8);
    expect(view.setHighlight).toHaveBeenCalledExactlyOnceWith(8);
  });

  it('highlights nothing while the view is dragged, and looks again once it has stopped', async () => {
    const view = track({ hover: true });
    rest();
    await answer(view, 7);

    press([150, 90]);
    pointer('pointermove', [152, 91], { buttons: 1 });
    expect(view.setHighlight).toHaveBeenLastCalledWith(7);
    pointer('pointermove', [250, 190], { buttons: 1 });
    expect(view.setHighlight).toHaveBeenLastCalledWith(null);
    vi.advanceTimersByTime(1000);
    expect(view.pick).toHaveBeenCalledTimes(1);

    view.moving = true;
    pointer('pointerup', [250, 190]);
    vi.advanceTimersByTime(1000);
    expect(view.pick).toHaveBeenCalledTimes(1);
    view.moving = false;
    vi.advanceTimersByTime(60);
    expect(view.pick).toHaveBeenLastCalledWith(150, 150);
  });

  it('keeps the highlight through a click, and takes it from the pick the click makes', async () => {
    const view = track({ hover: true, onClick: vi.fn() });
    rest();
    await answer(view, 7);

    press([150, 90]);
    pointer('pointermove', [151, 90], { buttons: 1 });
    pointer('pointerup', [151, 90]);
    await answer(view, 8);
    vi.advanceTimersByTime(1000);

    expect(view.setHighlight.mock.calls).toEqual([[7], [8]]);
    expect(view.pick).toHaveBeenCalledTimes(2);
  });

  it('highlights nothing while the view is dragged by another button', async () => {
    const view = track({ hover: true });
    rest();
    await answer(view, 7);

    pointer('pointerdown', [150, 90], { button: 2, buttons: 2 });
    pointer('pointermove', [151, 90], { buttons: 2 });

    expect(view.setHighlight).toHaveBeenLastCalledWith(null);
  });

  it('looks again once a wheel has zoomed the view under it', async () => {
    const view = track({ hover: true });
    element.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
    vi.advanceTimersByTime(1000);
    // Where the pointer is has not been heard yet.
    expect(view.pick).not.toHaveBeenCalled();

    rest();
    await answer(view, 7);
    view.moving = true;
    element.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
    vi.advanceTimersByTime(1000);
    expect(view.pick).toHaveBeenCalledTimes(1);
    view.moving = false;
    vi.advanceTimersByTime(60);

    expect(view.pick).toHaveBeenCalledTimes(2);
    expect(view.pick).toHaveBeenLastCalledWith(50, 50);
  });

  it('goes on looking after a pick that fails', async () => {
    const view = track({ hover: true });
    view.pick
      .mockImplementationOnce(() => {
        throw new Error('context lost');
      })
      .mockImplementationOnce(() => Promise.reject(new Error('context lost')));

    rest();
    await vi.advanceTimersByTimeAsync(0);
    pointer('pointermove', [160, 90]);
    await vi.advanceTimersByTimeAsync(60);
    pointer('pointermove', [170, 90]);
    vi.advanceTimersByTime(60);

    expect(view.pick).toHaveBeenCalledTimes(3);
    expect(view.setHighlight.mock.calls).toEqual([[null], [null]]);
  });

  it('highlights none once it has left, whatever is answered after', async () => {
    const view = track({ hover: true });
    rest();

    pointer('pointerleave', [0, 0]);
    await answer(view, 7);
    vi.advanceTimersByTime(1000);

    expect(view.setHighlight.mock.calls).toEqual([[null]]);
    expect(view.pick).toHaveBeenCalledTimes(1);
  });

  it('tells of the cell that is clicked', async () => {
    const onClick = vi.fn();
    const view = track({ hover: false, onClick });

    press([150, 90]);
    pointer('pointerup', [152, 92]);
    expect(view.pick).toHaveBeenCalledExactlyOnceWith(52, 52);
    await answer(view, 7);

    expect(onClick).toHaveBeenCalledExactlyOnceWith(7);
    expect(view.setHighlight).not.toHaveBeenCalled();
  });

  it('tells of no click where none is drawn', async () => {
    const onClick = vi.fn();
    const view = track({ hover: false, onClick });
    click([150, 90]);

    await answer(view, null);

    expect(onClick).not.toHaveBeenCalled();
  });

  it.each([
    ['a drag', () => press([150, 90]), [155, 90]],
    [
      'another button',
      () => pointer('pointerdown', [150, 90], { button: 2, buttons: 2 }),
      [150, 90],
    ],
    ['a second finger', () => pointer('pointerdown', [150, 90], { isPrimary: false }), [150, 90]],
    ['a press that began elsewhere', () => {}, [150, 90]],
  ] as const)('takes %s for no click', (_, down, up) => {
    const view = track({ hover: false, onClick: vi.fn() });
    down();
    pointer('pointerup', [...up]);
    expect(view.pick).not.toHaveBeenCalled();
  });

  it('takes a press the browser took over for no click', () => {
    const view = track({ hover: false, onClick: vi.fn() });
    press([150, 90]);
    pointer('pointercancel', [150, 90]);
    pointer('pointerup', [150, 90]);
    expect(view.pick).not.toHaveBeenCalled();
  });

  it('looks for no cell under a pointer that only clicks', () => {
    const view = track({ hover: false, onClick: vi.fn() });
    pointer('pointermove', [150, 90]);
    vi.advanceTimersByTime(1000);
    expect(view.pick).not.toHaveBeenCalled();
  });

  it('hears nothing more once stopped, and leaves no cell highlighted', async () => {
    const onClick = vi.fn();
    const view = track({ hover: true, onClick });
    rest();
    click([150, 90]);
    view.setHighlight.mockClear();

    stop?.();
    stop = undefined;
    expect(view.setHighlight).toHaveBeenCalledExactlyOnceWith(null);
    await answer(view, 7);
    await answer(view, 7);
    pointer('pointermove', [150, 90]);
    click([150, 90]);
    vi.advanceTimersByTime(1000);

    expect(view.pick).toHaveBeenCalledTimes(2);
    expect(onClick).not.toHaveBeenCalled();
    expect(view.setHighlight).toHaveBeenCalledTimes(1);
  });
});
