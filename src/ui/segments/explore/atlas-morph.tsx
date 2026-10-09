'use client';

import { type RefObject, useLayoutEffect, useRef } from 'react';

/** How long a departed atlas box waits for the box that takes its place. */
const MORPH_WINDOW_MS = 1500;
const FLIGHT_MS = 380;
/**
 * Transforms only, so the compositor runs the flight: the page mounting beneath it
 * keeps the main thread busy, and an animation that needs it stutters. The easing is
 * baked into sampled keyframes, so the box and the picture it clips stay in step.
 */
const FLIGHT: KeyframeAnimationOptions = {
  duration: FLIGHT_MS,
  easing: 'linear',
  fill: 'forwards',
};
const FLIGHT_SAMPLES = 30;
const FADE: KeyframeAnimationOptions = { duration: 160, easing: 'ease-out', fill: 'forwards' };
/** The picture's brain gliding onto the drawn one as it fades. */
const SETTLE: KeyframeAnimationOptions = {
  duration: 260,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  fill: 'forwards',
};
/** The atlas clear colour, #002766: pixels well away from it are brain. */
const CLEAR_RGB = [0x00, 0x27, 0x66];
/** Width of the copy a frame is shrunk to before looking for the brain in it. */
const PROBE_PX = 96;
/** How long the brain's picture waits for the new viewer to draw its own. */
const DRAW_WAIT_MS = 2500;
/** The picture's longest side: it is only ever seen in motion. */
const PICTURE_MAX_PX = 1024;

type TBox = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
/** Top left, top right, bottom right, bottom left. */
type TCorners = number[];

interface IDeparted {
  box: TBox;
  corners: TCorners;
  /** the atlas's last frame, and where it was on screen */
  picture: { canvas: HTMLCanvasElement; box: TBox } | null;
  at: number;
}

/** Where a view drew the brain, as a share of its box, and that box's size. */
interface IFraming {
  width: number;
  height: number;
  brain: TBox;
}

// Read and written only by the plain functions below: inside components and hooks the
// React Compiler treats a module variable as a constant, and it folded a copy taken
// before the reset into the reads after it.
let departed: IDeparted | null = null;
/** By view (its element id), so a picture can land where that view will draw the brain. */
const framings = new Map<string, IFraming>();
/** Kept across reloads too, so even the first flight after one lands true. */
const FRAMINGS_KEY = 'atlas-morph-framings';
let framingsLoaded = false;

function loadFramings() {
  if (framingsLoaded) return;
  framingsLoaded = true;
  try {
    const stored = JSON.parse(localStorage.getItem(FRAMINGS_KEY) ?? '{}');
    for (const [id, framing] of Object.entries<IFraming>(stored)) {
      if (!framings.has(id)) framings.set(id, framing);
    }
  } catch {
    // no storage: remembered for this page load only
  }
}

function saveFramings() {
  try {
    localStorage.setItem(FRAMINGS_KEY, JSON.stringify(Object.fromEntries(framings)));
  } catch {
    // as above
  }
}

function recordDeparture(record: IDeparted) {
  departed = record;
}

/** The departed box, once: a second caller gets nothing. */
function takeDeparture() {
  const taken = departed;
  departed = null;
  return taken;
}

function toBox(el: Element): TBox {
  const { left, top, width, height } = el.getBoundingClientRect();
  return { left, top, width, height };
}

function lerpBox(from: TBox, to: TBox, progress: number): TBox {
  const at = (a: number, b: number) => a + (b - a) * progress;
  return {
    left: at(from.left, to.left),
    top: at(from.top, to.top),
    width: at(from.width, to.width),
    height: at(from.height, to.height),
  };
}

/** `share` (fractions of a box) inside `box`. */
function within(box: TBox, share: TBox): TBox {
  return {
    left: box.left + share.left * box.width,
    top: box.top + share.top * box.height,
    width: share.width * box.width,
    height: share.height * box.height,
  };
}

/** CSS `cubic-bezier(x1, y1, x2, y2)`, as a function of time. */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const curve = (t: number, a: number, b: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  return (x: number) => {
    let [lo, hi] = [0, 1];
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (curve(mid, x1, x2) < x) lo = mid;
      else hi = mid;
    }
    return curve((lo + hi) / 2, y1, y2);
  };
}
const FLIGHT_EASE = cubicBezier(0.22, 1, 0.36, 1);

function cornersOf(el: Element): TCorners {
  const style = getComputedStyle(el);
  return [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius,
  ].map((radius) => Number.parseFloat(radius) || 0);
}

/** Corner radii for an element scaled by `x` and `y` that look like `corners` on screen. */
function radii(corners: TCorners, x: number, y: number) {
  const horizontal = corners.map((c) => `${c / x}px`).join(' ');
  const vertical = corners.map((c) => `${c / y}px`).join(' ');
  return `${horizontal} / ${vertical}`;
}

/** Copies the atlas's last frame, which its viewer keeps for this (`preserveDrawingBuffer`). */
function pictureOf(el: HTMLElement): IDeparted['picture'] {
  const source = el.querySelector('canvas');
  if (!source?.width || !source.height) return null;
  const scale = Math.min(1, PICTURE_MAX_PX / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { canvas, box: toBox(source) };
}

/** Where the brain is in an atlas frame, as fractions of its width and height. */
function brainIn(frame: HTMLCanvasElement): TBox | null {
  const width = PROBE_PX;
  const height = Math.max(1, Math.round((PROBE_PX * frame.height) / frame.width));
  const probe = document.createElement('canvas');
  probe.width = width;
  probe.height = height;
  const context = probe.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(frame, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  let [minX, minY, maxX, maxY] = [width, height, -1, -1];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const distance =
        Math.abs(data[i] - CLEAR_RGB[0]) +
        Math.abs(data[i + 1] - CLEAR_RGB[1]) +
        Math.abs(data[i + 2] - CLEAR_RGB[2]);
      if (distance > 60) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) return null;
  return {
    left: minX / width,
    top: minY / height,
    width: (maxX - minX + 1) / width,
    height: (maxY - minY + 1) / height,
  };
}

/** The drawn brain in `target`'s viewer, on screen. */
function drawnBrain(target: HTMLElement): TBox | null {
  const canvas = target.querySelector('canvas');
  if (!target.querySelector('[data-atlas-drawn]') || !canvas?.width) return null;
  const share = brainIn(canvas);
  return share && within(toBox(canvas), share);
}

function rememberFraming(target: HTMLElement) {
  const brain = drawnBrain(target);
  if (!brain || !target.id) return;
  const box = toBox(target);
  loadFramings();
  framings.set(target.id, {
    width: box.width,
    height: box.height,
    brain: {
      left: (brain.left - box.left) / box.width,
      top: (brain.top - box.top) / box.height,
      width: brain.width / box.width,
      height: brain.height / box.height,
    },
  });
  saveFramings();
}

/**
 * Where `target` will draw a brain shaped like `shape` (width over height), if it has
 * drawn one at this size before; another species or a turned camera would not match.
 */
function recallBrain(target: HTMLElement, to: TBox, shape: number): TBox | null {
  loadFramings();
  const framing = framings.get(target.id);
  if (!framing || Math.abs(framing.width - to.width) > 2) return null;
  if (Math.abs(framing.height - to.height) > 2) return null;
  const brain = within(to, framing.brain);
  return Math.abs(brain.width / brain.height / shape - 1) < 0.12 ? brain : null;
}

/** The box a picture of `aspect` fills when its brain (`share` of it) covers `brain`. */
function pictureFor(brain: TBox, share: TBox, aspect: number): TBox {
  const width = Math.sqrt((brain.width / share.width) * (brain.height / share.height) * aspect);
  const height = width / aspect;
  return {
    left: brain.left + brain.width / 2 - (share.left + share.width / 2) * width,
    top: brain.top + brain.height / 2 - (share.top + share.height / 2) * height,
    width,
    height,
  };
}

/** The largest box of `aspect` centred in `box`. */
function fitInside(aspect: number, box: TBox): TBox {
  const width = Math.min(box.width, box.height * aspect);
  const height = width / aspect;
  return {
    left: box.left + (box.width - width) / 2,
    top: box.top + (box.height - height) / 2,
    width,
    height,
  };
}

/** Resolves once `target` holds a drawn atlas, or when that has taken too long. */
function whenDrawn(target: HTMLElement) {
  const giveUpAt = performance.now() + DRAW_WAIT_MS;
  return new Promise<void>((resolve) => {
    const check = () => {
      if (target.querySelector('[data-atlas-drawn]') || performance.now() > giveUpAt) {
        // one more frame, for the viewer to paint what it has loaded
        requestAnimationFrame(() => resolve());
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });
}

/**
 * Flies the departed box onto `target` with a picture of the departing brain, clipped to
 * the box, travelling to where the new view will draw its brain. It holds there until
 * that view has drawn, then fades onto it. It runs to the end by itself, so an unmount
 * (or a Strict Mode effect replay) leaves it be.
 */
async function fly(from: IDeparted, target: HTMLElement) {
  const to = toBox(target);
  const corners = cornersOf(target);
  const box = document.createElement('div');
  box.className = 'bg-primary-9 pointer-events-none fixed z-40 origin-top-left overflow-hidden';
  box.setAttribute('aria-hidden', 'true');
  Object.assign(box.style, {
    left: `${to.left}px`,
    top: `${to.top}px`,
    width: `${to.width}px`,
    height: `${to.height}px`,
  });

  const carried = from.picture && brainIn(from.picture.canvas);
  const aspect = from.picture ? from.picture.canvas.width / from.picture.canvas.height : 1;
  const landing =
    from.picture && carried
      ? recallBrain(target, to, (carried.width / carried.height) * aspect)
      : null;
  // where the picture comes to rest: on the brain the view will draw, else centred
  const rest =
    from.picture && carried && landing
      ? pictureFor(landing, carried, aspect)
      : fitInside(aspect, to);

  let picture: HTMLDivElement | null = null;
  if (from.picture) {
    picture = document.createElement('div');
    picture.className = 'pointer-events-none absolute top-0 left-0 origin-top-left';
    Object.assign(picture.style, { width: `${rest.width}px`, height: `${rest.height}px` });
    from.picture.canvas.className = 'block h-full w-full';
    picture.append(from.picture.canvas);
    box.append(picture);
  }
  document.body.append(box);

  const boxFrames: Keyframe[] = [];
  const cornerFrames: Keyframe[] = [];
  const pictureFrames: Keyframe[] = [];
  for (let k = 0; k <= FLIGHT_SAMPLES; k += 1) {
    const offset = k / FLIGHT_SAMPLES;
    const progress = FLIGHT_EASE(offset);
    const at = lerpBox(from.box, to, progress);
    const [sx, sy] = [at.width / to.width, at.height / to.height];
    const [bx, by] = [at.left - to.left, at.top - to.top];
    boxFrames.push({ offset, transform: `translate(${bx}px, ${by}px) scale(${sx}, ${sy})` });
    // the stretch would distort the corners, so they are set against it (on the main
    // thread, so they may lag a busy page, but the box itself does not)
    const seen = from.corners.map((c, i) => c + ((corners[i] ?? 0) - c) * progress);
    cornerFrames.push({ offset, borderRadius: radii(seen, sx, sy) });
    if (from.picture) {
      // undoes the box's stretch, so the brain is only ever scaled evenly
      const shown = lerpBox(from.picture.box, rest, progress);
      const x = (shown.left - to.left - bx) / sx;
      const y = (shown.top - to.top - by) / sy;
      const scaleX = shown.width / (sx * rest.width);
      const scaleY = shown.height / (sy * rest.height);
      pictureFrames.push({
        offset,
        transform: `translate(${x}px, ${y}px) scale(${scaleX}, ${scaleY})`,
      });
    }
  }
  const flights = [box.animate(boxFrames, FLIGHT), box.animate(cornerFrames, FLIGHT)];
  if (picture) flights.push(picture.animate(pictureFrames, FLIGHT));

  target.style.opacity = '0';
  try {
    await Promise.all(flights.map((flight) => flight.finished));
  } catch {
    // cancelled: tidy up below all the same
  }
  target.style.opacity = '';

  if (picture && from.picture && carried) {
    await whenDrawn(target);
    const drawn = drawnBrain(target);
    if (drawn && !landing) {
      // nothing remembered for this view yet: glide the brain onto the drawn one
      const onto = pictureFor(drawn, carried, aspect);
      const restAt = `translate(${rest.left - to.left}px, ${rest.top - to.top}px)`;
      const ontoAt = `translate(${onto.left - to.left}px, ${onto.top - to.top}px) scale(${onto.width / rest.width})`;
      picture.animate([{ transform: restAt }, { transform: ontoAt }], SETTLE);
    }
    rememberFraming(target);
  }
  try {
    await box.animate([{ opacity: 1 }, { opacity: 0 }], picture && !landing ? SETTLE : FADE)
      .finished;
  } catch {
    // as above
  }
  box.remove();
}

/**
 * Records where the atlas box was when it goes (the full atlas giving way to a table,
 * or the small card giving way to the full atlas), with a picture of its brain, for the
 * box that replaces it.
 */
export function useAtlasMorphSource(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    return () => {
      const box = toBox(el);
      if (box.width && box.height) {
        recordDeparture({
          box,
          corners: cornersOf(el),
          picture: pictureOf(el),
          at: performance.now(),
        });
      }
    };
  }, [ref, enabled]);
}

/**
 * Flies the departed atlas box onto `target`, which stays hidden until it lands. A
 * target arriving without one still learns where its view draws the brain, for later.
 */
export function AtlasMorph({ target }: { target: RefObject<HTMLElement | null> }) {
  // set once, so a Strict Mode effect replay neither takes a second box nor drops the one it took
  const tookRef = useRef(false);

  useLayoutEffect(() => {
    if (tookRef.current) return;
    tookRef.current = true;
    const source = takeDeparture();
    const el = target.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!source || reduce || performance.now() - source.at > MORPH_WINDOW_MS) {
      void whenDrawn(el).then(() => rememberFraming(el));
      return;
    }
    void fly(source, el);
  }, [target]);

  return null;
}
