import * as THREE from 'three';

import { CLICK_REACH } from './pointer';

import type { CircuitMorphologyView, ElectrodeGroup, ElectrodeTransform, Vec3 } from './types';

/** Degrees an array turns for a CSS pixel the pointer goes: the somas view's on a screen of pixel ratio 2. */
const TURN_PER_PX = 0.7;
/** How long a dropped array stays where it was dropped, at most, for the host to give it back there. */
const HOLD_MS = 2000;
/** How near, in µm and degrees, the host's array must come to the dropped one to be taken for it. */
const SAME = 0.05;

const { degToRad, euclideanModulo } = THREE.MathUtils;
const point3 = new THREE.Vector3();

type Rotation = ElectrodeTransform['rotation'];
type Point = { x: number; y: number };

/** An array out of the host's hands: being moved, or dropped and not given back yet. Its groups are copies. */
interface Held {
  id: string;
  groups: ElectrodeGroup[];
  /** Once dropped, when it goes back to the host whatever the host has. */
  release?: ReturnType<typeof setTimeout>;
}

/** An array being moved, and how it was when the pointer went down. */
interface Drag extends Held {
  pointer: number;
  turn: boolean;
  /** Where the pointer went down, the contact under it, and the point under it as deep in the view as the contact. */
  from: Point;
  contact: Vec3;
  grab: Vec3;
  origin: Vec3;
  rotation: Rotation;
  /** The groups' contacts about the origin, unturned. */
  local: Float32Array[];
  moved: boolean;
}

export interface ElectrodeTracker {
  /** The electrodes as the host has them, and the array its form has selected. */
  show(groups: readonly ElectrodeGroup[], selected: string | null): void;
  stop(): void;
}

/** In OBI-One's extrinsic ZXY, as the host places its arrays. */
function turnOf({ x, y, z }: Rotation): THREE.Quaternion {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(degToRad(x), degToRad(y), degToRad(z), 'ZXY')
  );
}

function originOf(groups: readonly ElectrodeGroup[]): Vec3 | null {
  const placed = groups.find((group) => group.origin);
  if (placed?.origin) return [...placed.origin];
  const marker = groups.find((group) => group.kind === 'origin' && group.coordinates.length >= 3);
  return marker ? [marker.coordinates[0], marker.coordinates[1], marker.coordinates[2]] : null;
}

function rotationOf(groups: readonly ElectrodeGroup[]): Rotation {
  const rotation = groups.find((group) => group.rotation)?.rotation;
  return { x: rotation?.x ?? 0, y: rotation?.y ?? 0, z: rotation?.z ?? 0 };
}

/** An array's origin, rotation and first contact, which the host places from the two as the drag did. */
function poseOf(groups: readonly ElectrodeGroup[]): number[] | null {
  const origin = originOf(groups);
  const placed = groups.filter((group) => group.coordinates.length >= 3);
  const tip = (placed.find((group) => group.kind !== 'origin') ?? placed[0])?.coordinates;
  if (!origin || !tip) return null;
  const { x, y, z } = rotationOf(groups);
  return [...origin, x, y, z, tip[0], tip[1], tip[2]];
}

/** Whether the host has the array, `own` its groups, where it was dropped. */
function givenBack(own: readonly ElectrodeGroup[], held: Held): boolean {
  const given = poseOf(own);
  const dropped = poseOf(held.groups);
  return (
    given !== null &&
    dropped !== null &&
    given.every((value, k) => Math.abs(value - dropped[k]) <= SAME)
  );
}

const vector = ([x, y, z]: Vec3) => ({ x, y, z });

function unturned(points: Float32Array, origin: Vec3, back: THREE.Quaternion): Float32Array {
  const out = new Float32Array(points.length);
  const from = vector(origin);
  for (let i = 0; i + 2 < points.length; i += 3) {
    point3.fromArray(points, i).sub(from).applyQuaternion(back).toArray(out, i);
  }
  return out;
}

/** Put `groups` at `origin`, turned by `rotation`, from their contacts about the origin unturned. */
function place(groups: ElectrodeGroup[], local: Float32Array[], origin: Vec3, rotation: Rotation) {
  const turn = turnOf(rotation);
  const to = vector(origin);
  groups.forEach((group, k) => {
    const points = local[k];
    for (let i = 0; i + 2 < points.length; i += 3) {
      point3.fromArray(points, i).applyQuaternion(turn).add(to).toArray(group.coordinates, i);
    }
    group.origin = origin;
    group.rotation = rotation;
  });
}

/**
 * Draw the host's electrodes on `view`, and with `onTransform` let the pointer over `element` take hold of an array: a
 * drag moves it, and with Alt or Shift held, or the right button, turns it about its origin, as in the somas view.
 * `onTransform` hears where to once the gesture ends, and the array stays there until the host has it there too.
 *
 * A press on an electrode is kept from the canvas: the camera does not turn.
 */
export function trackElectrodes(
  element: HTMLElement,
  view: Pick<CircuitMorphologyView, 'setElectrodes' | 'electrodeAt' | 'fromScreen'>,
  onTransform?: (transform: ElectrodeTransform) => void
): ElectrodeTracker {
  const off = new AbortController();
  let groups: readonly ElectrodeGroup[] = [];
  let selected: string | null = null;
  let hovered: string | null = null;
  const held = new Map<string, Held>();
  let drag: Drag | null = null;
  let turnKeys = false;

  const shown = (): readonly ElectrodeGroup[] =>
    held.size === 0
      ? groups
      : [
          ...groups.filter((group) => !held.has(group.id)),
          ...[...held.values()].flatMap((h) => h.groups),
        ];
  const draw = () => view.setElectrodes(shown(), hovered ?? selected);

  const letGo = (id: string) => {
    clearTimeout(held.get(id)?.release);
    held.delete(id);
  };

  const cursor = () => {
    let style = '';
    if (drag) style = drag.turn ? 'move' : 'grabbing';
    else if (hovered) style = turnKeys ? 'move' : 'grab';
    element.style.cursor = style;
  };

  const hover = (id: string | null) => {
    if (id === hovered) return;
    hovered = id;
    draw();
  };

  const at = (e: PointerEvent): Point => {
    const box = element.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };

  const follow = (d: Drag, to: Point) => {
    d.moved = true;
    let { origin, rotation } = d;
    if (d.turn) {
      // Up turns about x and right about z, as the hand goes; y is kept.
      rotation = {
        x: euclideanModulo(d.rotation.x - (to.y - d.from.y) * TURN_PER_PX, 360),
        y: d.rotation.y,
        z: euclideanModulo(d.rotation.z - (to.x - d.from.x) * TURN_PER_PX, 360),
      };
    } else {
      // On the plane facing the eye through the contact taken hold of, so that it stays under the pointer.
      const [x, y, z] = view.fromScreen(to.x, to.y, d.contact);
      origin = [
        d.origin[0] + x - d.grab[0],
        d.origin[1] + y - d.grab[1],
        d.origin[2] + z - d.grab[2],
      ];
    }
    place(d.groups, d.local, origin, rotation);
  };

  const onDown = (e: PointerEvent) => {
    if (drag || e.button === 1) return;
    const turn = e.altKey || e.shiftKey || e.button === 2;
    if (!turn && e.button !== 0) return;
    const point = at(e);
    const hit = view.electrodeAt(point.x, point.y);
    if (!hit) return;
    e.stopPropagation();
    element.setPointerCapture(e.pointerId);
    clearTimeout(held.get(hit.id)?.release);
    // As drawn: an array dropped and not given back yet is taken from where it was dropped.
    const own = shown().filter((group) => group.id === hit.id);
    const origin = originOf(own) ?? hit.contact;
    const rotation = rotationOf(own);
    const back = turnOf(rotation).invert();
    drag = {
      id: hit.id,
      groups: own.map((group) => ({
        ...group,
        coordinates: Float32Array.from(group.coordinates),
        origin,
        rotation,
      })),
      pointer: e.pointerId,
      turn,
      from: point,
      contact: hit.contact,
      grab: view.fromScreen(point.x, point.y, hit.contact),
      origin,
      rotation,
      local: own.map((group) => unturned(group.coordinates, origin, back)),
      moved: false,
    };
    held.set(hit.id, drag);
    hovered = hit.id;
    cursor();
    draw();
  };

  const onMove = (e: PointerEvent) => {
    if (drag) {
      if (e.pointerId !== drag.pointer) return;
      e.stopPropagation();
      const to = at(e);
      // A press that may yet be a click moves nothing.
      if (!drag.moved && Math.hypot(to.x - drag.from.x, to.y - drag.from.y) <= CLICK_REACH) return;
      follow(drag, to);
      draw();
      return;
    }
    if (e.buttons !== 0) return;
    turnKeys = e.altKey || e.shiftKey;
    const point = at(e);
    hover(view.electrodeAt(point.x, point.y)?.id ?? null);
    cursor();
  };

  const onUp = (e: PointerEvent) => {
    const d = drag;
    if (!d || e.pointerId !== d.pointer) return;
    e.stopPropagation();
    drag = null;
    // A press let go where it was is no gesture, and the form is left as it is.
    if (d.moved) {
      onTransform?.({
        id: d.id,
        origin: vector(originOf(d.groups) ?? d.origin),
        rotation: rotationOf(d.groups),
        phase: 'end',
      });
      d.release = setTimeout(() => {
        held.delete(d.id);
        draw();
      }, HOLD_MS);
    } else letGo(d.id);
    cursor();
    draw();
  };

  // The browser took the pointer over: what it held goes back, and it rests on nothing.
  const onCancel = (e: PointerEvent) => {
    const d = drag;
    if (!d || e.pointerId !== d.pointer) return;
    e.stopPropagation();
    drag = null;
    hovered = null;
    letGo(d.id);
    cursor();
    draw();
  };

  // A turn with the right button opens no menu, whichever element the browser sends it to.
  const onMenu = (e: MouseEvent) => {
    if (drag || hovered) e.preventDefault();
  };

  const onLeave = () => {
    if (drag) return;
    hover(null);
    cursor();
  };

  const onKey = (e: KeyboardEvent) => {
    turnKeys = e.altKey || e.shiftKey;
    cursor();
  };

  if (onTransform) {
    // Ahead of the camera's controls on the canvas.
    const capture = { signal: off.signal, capture: true };
    element.addEventListener('pointerdown', onDown, capture);
    element.addEventListener('pointermove', onMove, capture);
    element.addEventListener('pointerup', onUp, capture);
    element.addEventListener('pointercancel', onCancel, capture);
    element.addEventListener('contextmenu', onMenu, capture);
    element.addEventListener('pointerleave', onLeave, { signal: off.signal });
    window.addEventListener('keydown', onKey, { signal: off.signal });
    window.addEventListener('keyup', onKey, { signal: off.signal });
  }

  return {
    show(next, nextSelected) {
      groups = next;
      selected = nextSelected;
      for (const h of held.values()) {
        if (h === drag) continue;
        // Given back, or gone from the host altogether.
        const own = next.filter((group) => group.id === h.id);
        if (own.length === 0 || givenBack(own, h)) letGo(h.id);
      }
      draw();
    },
    stop() {
      off.abort();
      for (const h of held.values()) clearTimeout(h.release);
      element.style.cursor = '';
    },
  };
}
