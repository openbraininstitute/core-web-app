// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { trackElectrodes } from '@/features/circuit-viewer/morphologies/electrodes';
import { electrodeDictionaryToPlaceholderOverlays } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';

import type {
  ElectrodeGroup,
  ElectrodeTransform,
  Vec3,
} from '@/features/circuit-viewer/morphologies/types';

/** The view's part, an orthographic one facing down z at a µm a pixel: x goes right, y up. */
function fakeView() {
  return {
    setElectrodes: vi.fn((_groups: readonly ElectrodeGroup[], _highlighted: string | null) => {}),
    // Anything within 10 pixels of 50, 50 in the view is on array A's first contact, and of 150, 50 on array B's.
    electrodeAt: vi.fn((x: number, y: number) => {
      if (Math.hypot(x - 50, y - 50) <= 10) return { id: 'A', contact: [10, 20, 30] as Vec3 };
      if (Math.hypot(x - 150, y - 50) <= 10) return { id: 'B', contact: [0, 0, 0] as Vec3 };
      return null;
    }),
    fromScreen: vi.fn((x: number, y: number, depthOf: Vec3): Vec3 => [x, -y, depthOf[2]]),
  };
}

/** Array A, two contacts 20 µm apart along y and the marker of its origin, the first contact; and array B. */
function host(): ElectrodeGroup[] {
  const placement = { origin: [10, 20, 30] as Vec3, rotation: { x: 0, y: 0, z: 0 } };
  return [
    {
      id: 'A',
      color: '#1b6ef3',
      kind: 'electrodes',
      coordinates: Float32Array.of(10, 20, 30, 10, 40, 30),
      ...placement,
    },
    {
      id: 'A',
      color: '#0b3e93',
      kind: 'origin',
      coordinates: Float32Array.of(10, 20, 30),
      ...placement,
    },
    { id: 'B', color: '#12a150', kind: 'electrodes', coordinates: Float32Array.of(0, 0, 0) },
  ];
}

/** The host's answer once it has array A where `dropA` drops it, 10 µm along x and 20 along y. */
const givenA = (groups: ElectrodeGroup[]) =>
  groups.map((group) =>
    group.id === 'A'
      ? {
          ...group,
          coordinates: group.coordinates.map((value, i) => value + [10, 20, 0][i % 3]),
          origin: [20, 40, 30] as Vec3,
        }
      : group
  );

let element: HTMLElement;
/** Stands for the camera's controls, which listen on the canvas. */
let canvas: HTMLCanvasElement;
let stop: (() => void) | undefined;
/** What the camera, on the canvas, and the cells' pointer, on the element in the capture phase, heard. */
let heard: string[];

function track(onTransform?: (transform: ElectrodeTransform) => void) {
  const view = fakeView();
  const tracker = trackElectrodes(element, view, onTransform);
  stop = tracker.stop;
  tracker.show(host(), null);
  return { view, tracker };
}

/** The cells' pointer heard the gesture, and the camera none of it. */
const CELLS_ONLY = ['cells pointerdown', 'cells pointermove', 'cells pointerup'];

/** At a point of the page: the view starts 100 pixels across and 40 down. Over the canvas, as the pointer is. */
const pointer = (type: string, at: [number, number], init: PointerEventInit = {}) =>
  canvas.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      isPrimary: true,
      pointerId: 1,
      clientX: at[0],
      clientY: at[1],
      ...init,
    })
  );
/** On array A's first contact, at 50, 50 in the view, and on array B's, at 150, 50. */
const ON_A: [number, number] = [150, 90];
const ON_B: [number, number] = [250, 90];
/** Takes hold of array A and drops it 10 pixels right and 20 up. */
const dropA = () => {
  pointer('pointerdown', ON_A, { buttons: 1 });
  pointer('pointermove', [160, 70], { buttons: 1 });
  pointer('pointerup', [160, 70]);
};

const rounded = (values: Iterable<number>) =>
  Array.from(values, (value) => Math.round(value * 100) / 100);

const drawn = (view: ReturnType<typeof fakeView>) => {
  const [groups, highlighted] = view.setElectrodes.mock.lastCall ?? [[], null];
  return {
    highlighted,
    of: (id: string, kind: string) =>
      rounded(groups.find((g) => g.id === id && g.kind === kind)?.coordinates ?? []),
    groups,
  };
};

beforeEach(() => {
  vi.useFakeTimers();
  element = document.body.appendChild(document.createElement('div'));
  canvas = element.appendChild(document.createElement('canvas'));
  element.getBoundingClientRect = () => ({ left: 100, top: 40 }) as DOMRect;
  element.setPointerCapture = vi.fn();
  heard = [];
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
    canvas.addEventListener(type, () => heard.push(`camera ${type}`));
    element.addEventListener(type, () => heard.push(`cells ${type}`), { capture: true });
  }
});

afterEach(() => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('the electrodes over the morphologies', () => {
  it("draws the host's electrodes, with the array its form has selected highlighted", () => {
    const { view, tracker } = track();
    const groups = host();

    tracker.show(groups, 'B');

    expect(view.setElectrodes).toHaveBeenLastCalledWith(groups, 'B');
  });

  it('holds them still where the host cannot be told of a move', () => {
    const { view } = track();

    pointer('pointermove', ON_A);
    pointer('pointerdown', ON_A, { buttons: 1 });
    pointer('pointermove', [160, 70], { buttons: 1 });

    expect(view.electrodeAt).not.toHaveBeenCalled();
    expect(view.setElectrodes).toHaveBeenCalledTimes(1);
    expect(heard).toContain('camera pointerdown');
  });

  it('highlights the array the pointer rests on over the one selected, with a hand to take hold of it', () => {
    const { view, tracker } = track(vi.fn());
    tracker.show(host(), 'B');

    pointer('pointermove', ON_A);
    expect(view.electrodeAt).toHaveBeenLastCalledWith(50, 50);
    expect(drawn(view).highlighted).toBe('A');
    expect(element.style.cursor).toBe('grab');
    pointer('pointermove', ON_A, { altKey: true });
    expect(element.style.cursor).toBe('move');

    pointer('pointermove', [300, 300]);
    expect(drawn(view).highlighted).toBe('B');
    expect(element.style.cursor).toBe('');
  });

  it('moves an array by dragging it, on the plane facing the eye, and tells the host once it is dropped', () => {
    const onTransform = vi.fn();
    const { view } = track(onTransform);

    pointer('pointerdown', ON_A, { buttons: 1 });
    expect(element.setPointerCapture).toHaveBeenCalledWith(1);
    expect(element.style.cursor).toBe('grabbing');
    // 10 pixels right and 20 up: 10 µm along x and 20 along y.
    pointer('pointermove', [160, 70], { buttons: 1 });
    // As deep as the point taken hold of, the contact's.
    expect(view.fromScreen).toHaveBeenLastCalledWith(60, 30, [50, -50, 30]);
    expect(drawn(view).of('A', 'electrodes')).toEqual([20, 40, 30, 20, 60, 30]);
    expect(drawn(view).of('A', 'origin')).toEqual([20, 40, 30]);
    expect(drawn(view).of('B', 'electrodes')).toEqual([0, 0, 0]);
    expect(onTransform).not.toHaveBeenCalled();

    pointer('pointerup', [160, 70]);

    expect(onTransform).toHaveBeenCalledExactlyOnceWith({
      id: 'A',
      origin: { x: 20, y: 40, z: 30 },
      rotation: { x: 0, y: 0, z: 0 },
    });
    expect(heard).toEqual(CELLS_ONLY);
  });

  it.each([
    ['Alt', { altKey: true }],
    ['Shift', { shiftKey: true }],
    ['the right button', { button: 2, buttons: 2 }],
  ])('turns an array about its origin with %s', (_, init) => {
    const onTransform = vi.fn();
    const { view } = track(onTransform);

    pointer('pointerdown', ON_A, { buttons: 1, ...init });
    expect(element.style.cursor).toBe('move');
    // 50 pixels right turns it 35° about z, the hand's way.
    pointer('pointermove', [200, 90], { buttons: 1, ...init });
    const turn = (325 * Math.PI) / 180;
    const tip = [10 - 20 * Math.sin(turn), 20 + 20 * Math.cos(turn), 30];
    expect(drawn(view).of('A', 'electrodes')).toEqual(rounded([10, 20, 30, ...tip]));
    expect(drawn(view).of('A', 'origin')).toEqual([10, 20, 30]);
    pointer('pointerup', [200, 90]);

    const [transform] = onTransform.mock.lastCall ?? [];
    expect(transform.origin).toEqual({ x: 10, y: 20, z: 30 });
    expect(transform.rotation.x).toBe(0);
    expect(transform.rotation.y).toBe(0);
    expect(transform.rotation.z).toBeCloseTo(325);
    expect(heard).toEqual(CELLS_ONLY);
  });

  it('turns it about x as the pointer goes up, keeping its turn about y', () => {
    const onTransform = vi.fn();
    const { view, tracker } = track(onTransform);
    tracker.show(
      host().map((group) => ({ ...group, rotation: { x: 0, y: 40, z: 0 } })),
      null
    );

    pointer('pointerdown', ON_A, { buttons: 1, altKey: true });
    pointer('pointermove', [150, 40], { buttons: 1, altKey: true });
    pointer('pointerup', [150, 40]);

    expect(onTransform.mock.lastCall?.[0].rotation).toEqual({ x: 35, y: 40, z: 0 });
    expect(view.setElectrodes).toHaveBeenCalled();
  });

  it("places a turned array where the host's form places it, in OBI-One's ZXY", () => {
    const { view, tracker } = track(vi.fn());
    const block = {
      origin_x: 10,
      origin_y: 20,
      origin_z: 30,
      rotation_y: 40,
      n_electrodes: 3,
      spacing: 20,
    };
    const contactsAt = (rotation_x: number, rotation_z: number) =>
      electrodeDictionaryToPlaceholderOverlays({ A: { ...block, rotation_x, rotation_z } }).find(
        (group) => group.kind === 'electrodes'
      )?.coordinates ?? [];
    tracker.show(
      electrodeDictionaryToPlaceholderOverlays({ A: { ...block, rotation_x: 30, rotation_z: 50 } }),
      null
    );

    // 50 pixels right and 20 up: 35° less about z and 14° more about x.
    pointer('pointerdown', ON_A, { buttons: 1, altKey: true });
    pointer('pointermove', [200, 70], { buttons: 1, altKey: true });

    const turned = drawn(view).groups.find((g) => g.id === 'A' && g.kind === 'electrodes');
    expect([...(turned?.coordinates ?? [])]).toEqual(
      Array.from(contactsAt(44, 15), (value) => expect.closeTo(value, 3))
    );
  });

  it('keeps a dropped array where it was dropped until the host has it there', () => {
    const { view, tracker } = track(vi.fn());
    dropA();

    // The host's answer of before the drop.
    tracker.show(host(), null);
    expect(drawn(view).of('A', 'electrodes')).toEqual([20, 40, 30, 20, 60, 30]);

    const moved = givenA(host());
    tracker.show(moved, null);
    expect(drawn(view).groups).toBe(moved);
  });

  it('takes the host to have a dropped array there however it writes the turn', () => {
    const { view, tracker } = track(vi.fn());
    const turned = (x: number) =>
      host().map((group) => (group.id === 'A' ? { ...group, rotation: { x, y: 0, z: 0 } } : group));
    tracker.show(turned(-30), null);
    dropA();

    // OBI-One keeps it in [0, 360).
    const moved = givenA(turned(330));
    tracker.show(moved, null);
    expect(drawn(view).groups).toBe(moved);
  });

  it('gives a dropped array back to the host after 2 s, whatever the host has', () => {
    const { view } = track(vi.fn());
    dropA();

    vi.advanceTimersByTime(1999);
    expect(drawn(view).of('A', 'electrodes')).toEqual([20, 40, 30, 20, 60, 30]);
    vi.advanceTimersByTime(1);
    expect(drawn(view).of('A', 'electrodes')).toEqual([10, 20, 30, 10, 40, 30]);
  });

  it('takes a dropped array the host has not given back yet from where it was dropped', () => {
    const onTransform = vi.fn();
    const { view } = track(onTransform);
    dropA();

    pointer('pointerdown', ON_A, { buttons: 1 });
    pointer('pointermove', [160, 90], { buttons: 1 });
    pointer('pointerup', [160, 90]);

    expect(drawn(view).of('A', 'electrodes')).toEqual([30, 40, 30, 30, 60, 30]);
    expect(onTransform.mock.lastCall?.[0].origin).toEqual({ x: 30, y: 40, z: 30 });
  });

  it.each([
    ['let go where it went down', 'pointerup'],
    ['the browser takes over', 'pointercancel'],
  ])('keeps a dropped array where it was dropped through a press %s', (_, type) => {
    const { view } = track(vi.fn());
    dropA();

    pointer('pointerdown', ON_A, { buttons: 1 });
    pointer(type, ON_A);

    expect(drawn(view).of('A', 'electrodes')).toEqual([20, 40, 30, 20, 60, 30]);
    vi.advanceTimersByTime(2000);
    expect(drawn(view).of('A', 'electrodes')).toEqual([10, 20, 30, 10, 40, 30]);
  });

  it('leaves a second finger to the camera, for a pinch', () => {
    track(vi.fn());

    pointer('pointerdown', ON_A, { buttons: 1, isPrimary: false, pointerId: 2 });

    expect(element.setPointerCapture).not.toHaveBeenCalled();
    expect(heard).toEqual(['cells pointerdown', 'camera pointerdown']);
  });

  it('takes a press let go within a few pixels of where it went down for no gesture', () => {
    const onTransform = vi.fn();
    const { view } = track(onTransform);

    pointer('pointerdown', ON_A, { buttons: 1 });
    pointer('pointermove', [153, 88], { buttons: 1 });
    pointer('pointerup', [153, 88]);
    vi.advanceTimersByTime(3000);

    expect(onTransform).not.toHaveBeenCalled();
    expect(drawn(view).of('A', 'electrodes')).toEqual([10, 20, 30, 10, 40, 30]);
    expect(heard).toEqual(CELLS_ONLY);
  });

  it('keeps each dropped array until the host has it there, though another is taken hold of meanwhile', () => {
    const { view, tracker } = track(vi.fn());
    dropA();

    pointer('pointerdown', ON_B, { buttons: 1 });
    pointer('pointermove', [260, 90], { buttons: 1 });
    pointer('pointerup', [260, 90]);
    tracker.show(host(), null);

    expect(drawn(view).of('A', 'electrodes')).toEqual([20, 40, 30, 20, 60, 30]);
    expect(drawn(view).of('B', 'electrodes')).toEqual([10, 0, 0]);
    vi.advanceTimersByTime(2000);
    expect(drawn(view).of('A', 'electrodes')).toEqual([10, 20, 30, 10, 40, 30]);
    expect(drawn(view).of('B', 'electrodes')).toEqual([0, 0, 0]);
  });

  it('lets a dropped array go once the host has it no more', () => {
    const { view, tracker } = track(vi.fn());
    dropA();

    const others = host().filter((group) => group.id !== 'A');
    tracker.show(others, null);

    expect(drawn(view).groups).toBe(others);
  });

  it('opens no menu for a turn with the right button, as it goes down or comes up', () => {
    track(vi.fn());
    const menu = () => {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      canvas.dispatchEvent(event);
      return event.defaultPrevented;
    };

    pointer('pointerdown', ON_A, { button: 2, buttons: 2 });
    expect(menu()).toBe(true);
    pointer('pointermove', [200, 90], { buttons: 2 });
    pointer('pointerup', [200, 90], { button: 2 });
    expect(menu()).toBe(true);

    pointer('pointermove', [300, 300]);
    expect(menu()).toBe(false);
  });

  it('drops a gesture the browser takes over, and tells the host nothing', () => {
    const onTransform = vi.fn();
    const { view } = track(onTransform);

    pointer('pointerdown', ON_A, { buttons: 1 });
    pointer('pointermove', [160, 70], { buttons: 1 });
    pointer('pointercancel', [160, 70]);
    pointer('pointerup', [160, 70]);

    expect(onTransform).not.toHaveBeenCalled();
    expect(drawn(view).of('A', 'electrodes')).toEqual([10, 20, 30, 10, 40, 30]);
    expect(element.style.cursor).toBe('');
  });

  it.each([
    ['a press off the electrodes', [300, 300], { buttons: 1 }],
    ['the middle button', ON_A, { button: 1, buttons: 4, altKey: true }],
  ] as const)('leaves %s to the camera and the cells', (_, at, init) => {
    const onTransform = vi.fn();
    track(onTransform);

    pointer('pointerdown', [...at], init);
    pointer('pointermove', [at[0] + 10, at[1]], { buttons: init.buttons });
    pointer('pointerup', [at[0] + 10, at[1]]);

    expect(onTransform).not.toHaveBeenCalled();
    expect(heard).toEqual([
      'cells pointerdown',
      'camera pointerdown',
      'cells pointermove',
      'camera pointermove',
      'cells pointerup',
      'camera pointerup',
    ]);
  });

  it('hears nothing more once stopped', () => {
    const onTransform = vi.fn();
    const { view, tracker } = track(onTransform);
    pointer('pointermove', ON_A);

    tracker.stop();
    stop = undefined;
    expect(element.style.cursor).toBe('');
    view.electrodeAt.mockClear();
    pointer('pointermove', ON_A);
    dropA();

    expect(view.electrodeAt).not.toHaveBeenCalled();
    expect(onTransform).not.toHaveBeenCalled();
  });
});
