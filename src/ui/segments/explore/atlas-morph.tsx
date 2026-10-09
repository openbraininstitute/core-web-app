'use client';

import { type RefObject, useLayoutEffect, useRef } from 'react';

/** How long a departed atlas box waits for the box that takes its place. */
const MORPH_WINDOW_MS = 1500;
/**
 * Transforms only, so the compositor runs the flight: the page mounting beneath it
 * keeps the main thread busy, and an animation that needs it stutters.
 */
const FLIGHT: KeyframeAnimationOptions = {
  duration: 380,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  fill: 'forwards',
};
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

// Read and written only by the plain functions below: inside components and hooks the
// React Compiler treats a module variable as a constant, and it folded a copy taken
// before the reset into the reads after it.
let departed: IDeparted | null = null;

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

function cornersOf(el: Element): TCorners {
  const style = getComputedStyle(el);
  return [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius,
  ].map((radius) => Number.parseFloat(radius) || 0);
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

/** Puts an element laid out at `at` (scaling from its top left corner) onto `onto`. */
function moveOnto(onto: TBox, at: TBox) {
  const x = onto.left - at.left;
  const y = onto.top - at.top;
  return `translate(${x}px, ${y}px) scale(${onto.width / at.width}, ${onto.height / at.height})`;
}

/** Corner radii for an element scaled by `x` and `y` that look like `corners` on screen. */
function radii(corners: TCorners, x: number, y: number) {
  const horizontal = corners.map((c) => `${c / x}px`).join(' ');
  const vertical = corners.map((c) => `${c / y}px`).join(' ');
  return `${horizontal} / ${vertical}`;
}

function layer(box: TBox, className: string) {
  const el = document.createElement('div');
  el.className = className;
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  });
  document.body.append(el);
  return el;
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

/** `share` (fractions of a box) inside `box`. */
function within(box: TBox, share: TBox): TBox {
  return {
    left: box.left + share.left * box.width,
    top: box.top + share.top * box.height,
    width: share.width * box.width,
    height: share.height * box.height,
  };
}

/** Scales evenly about `origin` (top left) so that `from` comes to rest centred on `onto`. */
function glideOnto(onto: TBox, from: TBox, origin: Pick<TBox, 'left' | 'top'>) {
  const scale = Math.sqrt((onto.width / from.width) * (onto.height / from.height));
  const x =
    onto.left + onto.width / 2 - origin.left - scale * (from.left + from.width / 2 - origin.left);
  const y =
    onto.top + onto.height / 2 - origin.top - scale * (from.top + from.height / 2 - origin.top);
  return `translate(${x}px, ${y}px) scale(${scale})`;
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
 * Flies the departed box onto `target`, carrying a picture of the brain that stays until
 * the new viewer has drawn its own. It runs to the end by itself, so an unmount (or a
 * Strict Mode effect replay) leaves it be.
 */
async function fly(from: IDeparted, target: HTMLElement) {
  const to = toBox(target);
  const box = layer(to, 'bg-primary-9 pointer-events-none fixed z-40 origin-top-left');
  const flights = [
    box.animate([{ transform: moveOnto(from.box, to) }, { transform: 'none' }], FLIGHT),
    // the stretch would distort the corners; this keeps them round (on the main thread,
    // so they may lag a busy page, but the box itself does not)
    box.animate(
      [
        {
          borderRadius: radii(from.corners, from.box.width / to.width, from.box.height / to.height),
        },
        { borderRadius: radii(cornersOf(target), 1, 1) },
      ],
      FLIGHT
    ),
  ];

  // a sibling, scaled evenly, so the brain is never stretched; fitted, so it stays in the box
  const carried = from.picture && {
    canvas: from.picture.canvas,
    end: fitInside(from.picture.canvas.width / from.picture.canvas.height, to),
  };
  let picture: HTMLDivElement | null = null;
  if (from.picture && carried) {
    const { box: start } = from.picture;
    const { canvas, end } = carried;
    picture = layer(end, 'pointer-events-none fixed z-40 origin-top-left overflow-hidden');
    picture.style.borderRadius = radii(
      from.corners,
      start.width / end.width,
      start.height / end.height
    );
    canvas.className = 'block h-full w-full';
    picture.append(canvas);
    flights.push(
      picture.animate([{ transform: moveOnto(start, end) }, { transform: 'none' }], FLIGHT)
    );
  }

  target.style.opacity = '0';
  try {
    await Promise.all(flights.map((flight) => flight.finished));
  } catch {
    // cancelled: tidy up below all the same
  }
  target.style.opacity = '';

  if (picture && carried) {
    await whenDrawn(target);
    // into the box, which now sits still, so the glide below stays inside it
    for (const flight of picture.getAnimations()) flight.cancel();
    picture.className = 'pointer-events-none absolute origin-top-left';
    Object.assign(picture.style, {
      left: `${carried.end.left - to.left}px`,
      top: `${carried.end.top - to.top}px`,
      borderRadius: '',
    });
    box.classList.add('overflow-hidden');
    box.append(picture);
    const carriedBrain = brainIn(carried.canvas);
    const drawn = target.querySelector('canvas');
    const drawnBrain = drawn?.width ? brainIn(drawn) : null;
    if (drawn && carriedBrain && drawnBrain) {
      const onto = within(toBox(drawn), drawnBrain);
      const glide = glideOnto(onto, within(carried.end, carriedBrain), carried.end);
      picture.animate([{ transform: 'none' }, { transform: glide }], SETTLE);
    }
  }
  try {
    await box.animate([{ opacity: 1 }, { opacity: 0 }], picture ? SETTLE : FADE).finished;
  } catch {
    // as above
  }
  box.remove();
  picture?.remove();
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

/** Flies the departed atlas box onto `target`, which stays hidden until it lands. */
export function AtlasMorph({ target }: { target: RefObject<HTMLElement | null> }) {
  // set once, so a Strict Mode effect replay neither takes a second box nor drops the one it took
  const tookRef = useRef(false);

  useLayoutEffect(() => {
    if (tookRef.current) return;
    tookRef.current = true;
    const source = takeDeparture();
    const el = target.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!source || !el || reduce || performance.now() - source.at > MORPH_WINDOW_MS) return;
    void fly(source, el);
  }, [target]);

  return null;
}
