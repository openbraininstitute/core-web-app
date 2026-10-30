// @vitest-environment jsdom
import { Quaternion } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { trackPointer } from '@/features/circuit-viewer/morphologies/pointer';
import { SectionType } from '@/features/circuit-viewer/section-type';

import type {
  CircuitMorphologyView,
  MarkerOnScreen,
  SectionSpot,
} from '@/features/circuit-viewer/morphologies/types';

type ViewListener = Parameters<CircuitMorphologyView['onViewChange']>[0];

/** The view's part: each pick waits to be answered. */
function fakeView() {
  const answers: ((cell: number | null) => void)[] = [];
  const spots: ((spot: SectionSpot | null) => void)[] = [];
  const turned = new Set<ViewListener>();
  const orientation = new Quaternion();
  return {
    /** The camera turned, as a spin turns it a frame at a time. */
    turn: () => {
      for (const listener of turned) listener(orientation);
    },
    onViewChange: (listener: ViewListener) => {
      turned.add(listener);
      listener(orientation);
      return () => {
        turned.delete(listener);
      };
    },
    answers,
    spots,
    pick: vi.fn((_x: number, _y: number) => new Promise<number | null>((r) => answers.push(r))),
    pickSection: vi.fn(
      (_x: number, _y: number) => new Promise<SectionSpot | null>((r) => spots.push(r))
    ),
    markerAt: vi.fn((_x: number, _y: number): ({ index: number } & MarkerOnScreen) | null => null),
    setHighlight: vi.fn((_cell: number | null) => {}),
    moving: false,
  };
}

let element: HTMLElement;
let stop: (() => void) | undefined;

function track(options: Parameters<typeof trackPointer>[2]) {
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
/** The promises a pick's answer goes through, settled. */
const settle = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
const answer = async (view: ReturnType<typeof fakeView>, cell: number | null) => {
  view.answers.shift()?.(cell);
  await settle();
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

  it('shows an answer that comes once it has moved on, and looks again where it is now', async () => {
    const view = track({ hover: true });
    rest();
    pointer('pointermove', [160, 90]);

    await answer(view, 7);

    expect(view.setHighlight).toHaveBeenCalledExactlyOnceWith(7);
    vi.advanceTimersByTime(60);
    expect(view.pick).toHaveBeenLastCalledWith(60, 50);
  });

  it('looks under a pointer that keeps moving, where it is each time', async () => {
    const view = track({ hover: true });
    for (let x = 150; x < 200; x += 2) {
      pointer('pointermove', [x, 90]);
      vi.advanceTimersByTime(16);
      await answer(view, x);
    }

    expect(view.pick).toHaveBeenCalledTimes(6);
    expect(view.pick.mock.calls.slice(0, 2)).toEqual([
      [56, 50],
      [64, 50],
    ]);
    expect(view.setHighlight).toHaveBeenCalledTimes(6);
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
    expect(view.setHighlight.mock.calls).toEqual([[7], [8]]);
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

  it('takes the highlight off a view that turns under a pointer at rest, and looks again once it has stopped', async () => {
    const view = track({ hover: true });
    rest();
    await answer(view, 7);

    view.moving = true;
    view.turn();
    expect(view.setHighlight).toHaveBeenLastCalledWith(null);
    for (let frame = 0; frame < 60; frame++) {
      vi.advanceTimersByTime(16);
      view.turn();
    }
    expect(view.pick).toHaveBeenCalledTimes(1);
    view.moving = false;
    vi.advanceTimersByTime(60);

    expect(view.pick).toHaveBeenCalledTimes(2);
    expect(view.pick).toHaveBeenLastCalledWith(50, 50);
  });

  it('shows no answer that comes once the view has turned', async () => {
    const view = track({ hover: true });
    rest();
    view.turn();

    await answer(view, 7);

    expect(view.setHighlight.mock.calls).toEqual([[null]]);
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

  it("looks for no cell where the point is something else's, and highlights none there", async () => {
    // Left of 55 in the view, say an electrode the pointer can take hold of.
    const taken = vi.fn((x: number, _y: number) => x < 55);
    const view = track({ hover: true, taken });
    rest();
    await settle();

    expect(taken).toHaveBeenCalledExactlyOnceWith(50, 50);
    expect(view.pick).not.toHaveBeenCalled();
    expect(view.setHighlight).toHaveBeenCalledExactlyOnceWith(null);
    pointer('pointermove', [160, 90]);
    vi.advanceTimersByTime(60);
    expect(view.pick).toHaveBeenCalledExactlyOnceWith(60, 50);
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

  it("tells of a click on no cell, but not on a cell nor on what is something else's", async () => {
    const onClick = vi.fn();
    const onEmptyClick = vi.fn();
    // Left of 55 in the view, say an electrode.
    const view = track({ hover: false, onClick, onEmptyClick, taken: (x) => x < 55 });
    click([160, 90]);
    await answer(view, null);
    expect(onEmptyClick).toHaveBeenCalledTimes(1);

    click([160, 90]);
    await answer(view, 7);
    click([150, 90]);
    await settle();
    expect(onEmptyClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledExactlyOnceWith(7);

    // A pick that fails tells of no click at all.
    view.pick.mockRejectedValueOnce(new Error('Locked'));
    click([160, 90]);
    await settle();
    expect(onEmptyClick).toHaveBeenCalledTimes(1);
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

  it('hears nothing more once stopped, and leaves no cell highlighted, nor a location', async () => {
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

/** A basal dendrite's point at 50, 50 in the view. */
const SPOT: SectionSpot = {
  cell: 3,
  sonataId: 12,
  type: SectionType.BasalDendrite,
  offset: 0.25,
  screen: { x: 0.5, y: 0.5 },
};
const MARKER = {
  index: 2,
  type: SectionType.ApicalDendrite,
  screen: { x: 0.4, y: 0.6 },
  visible: true,
};

describe('the pointer over morphology locations', () => {
  const options = () => ({ onHover: vi.fn(), onPick: vi.fn(), pickable: vi.fn(() => true) });
  const cursor = () => element.querySelector('canvas')?.style.cursor;

  beforeEach(() => {
    element.appendChild(document.createElement('canvas'));
  });

  it('tells of the marker it rests on before the section under it, with a hand', async () => {
    const locations = options();
    const view = track({ hover: false, locations });
    view.markerAt.mockReturnValue(MARKER);
    rest();
    await settle();

    expect(view.markerAt).toHaveBeenCalledExactlyOnceWith(50, 50);
    expect(view.pickSection).not.toHaveBeenCalled();
    expect(view.pick).not.toHaveBeenCalled();
    const { index, ...onScreen } = MARKER;
    expect(locations.onHover).toHaveBeenCalledExactlyOnceWith({ marker: index, ...onScreen });
    expect(cursor()).toBe('pointer');
  });

  it('tells of the point of a section it rests on, with a hand only where a click would act', async () => {
    const locations = options();
    const view = track({ hover: false, locations });
    rest();
    expect(view.pickSection).toHaveBeenCalledExactlyOnceWith(50, 50);
    view.spots.shift()?.(SPOT);
    await settle();
    expect(locations.onHover).toHaveBeenLastCalledWith({ spot: SPOT });
    expect(locations.pickable).toHaveBeenCalledWith(SPOT);
    expect(cursor()).toBe('pointer');

    locations.pickable.mockReturnValue(false);
    pointer('pointermove', [160, 90]);
    vi.advanceTimersByTime(60);
    view.spots.shift()?.({ ...SPOT, type: SectionType.Axon });
    await settle();
    expect(cursor()).toBe('');

    pointer('pointermove', [170, 90]);
    vi.advanceTimersByTime(60);
    view.spots.shift()?.(null);
    await settle();
    expect(locations.onHover).toHaveBeenLastCalledWith(null);
  });

  it('looks for the cell and the location at once, and tells of both', async () => {
    const locations = options();
    const view = track({ hover: true, locations });
    rest();
    expect(view.pick).toHaveBeenCalledTimes(1);
    expect(view.pickSection).toHaveBeenCalledTimes(1);
    view.spots.shift()?.(SPOT);
    await answer(view, 3);
    expect(view.setHighlight).toHaveBeenCalledExactlyOnceWith(3);
    expect(locations.onHover).toHaveBeenCalledExactlyOnceWith({ spot: SPOT });
  });

  it('tells of nothing while the view is dragged, nor once it has left', async () => {
    const locations = options();
    const view = track({ hover: false, locations });
    rest();
    view.spots.shift()?.(SPOT);
    await settle();

    press([150, 90]);
    pointer('pointermove', [250, 190], { buttons: 1 });
    expect(locations.onHover).toHaveBeenLastCalledWith(null);
    expect(cursor()).toBe('');
    locations.onHover.mockClear();
    pointer('pointerleave', [0, 0]);
    expect(locations.onHover).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('picks the marker or the point of a section a click lands on, the cell left alone', async () => {
    const locations = options();
    const view = track({ hover: false, locations });
    click([150, 90]);
    expect(view.pick).not.toHaveBeenCalled();
    view.spots.shift()?.(SPOT);
    await settle();
    expect(locations.onPick).toHaveBeenCalledExactlyOnceWith({ spot: SPOT });

    view.markerAt.mockReturnValue(MARKER);
    click([150, 90]);
    await settle();
    expect(locations.onPick).toHaveBeenLastCalledWith(expect.objectContaining({ marker: 2 }));
    expect(view.pickSection).toHaveBeenCalledTimes(1);
  });

  it('looks again once a click has picked, a location added there being a marker now', async () => {
    const locations = options();
    const view = track({ hover: false, locations });
    click([150, 90]);
    view.spots.shift()?.(SPOT);
    await settle();
    view.markerAt.mockReturnValue(MARKER);
    vi.advanceTimersByTime(60);
    await settle();
    expect(locations.onHover).toHaveBeenLastCalledWith(expect.objectContaining({ marker: 2 }));
  });

  it('picks nothing where a click finds nothing, nor where the point is taken', async () => {
    const locations = options();
    const view = track({ hover: false, locations, taken: (x) => x < 55 });
    click([150, 90]);
    await settle();
    expect(view.markerAt).not.toHaveBeenCalled();
    click([160, 90]);
    view.spots.shift()?.(null);
    await settle();
    expect(locations.onPick).not.toHaveBeenCalled();
  });
});
