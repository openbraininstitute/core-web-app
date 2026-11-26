/**
 * Triangular tongues of hexagons: each comes in from an edge of the frame, wide at its base where its category's
 * tile sits, narrowing towards the middle to a tip that curls the same way as every other, so together they turn
 * like a pinwheel round an empty middle. A tongue's places sit in a honeycomb filling its base first; nothing else
 * (the user had the small white tiles round them taken out, and everything made larger to fill the room).
 */

import { APO, SQRT3, apart, axial } from '@/ui/segments/project/hex-home/hex-geometry';

import type { IHexBox, IPoint } from '@/ui/segments/project/hex-home/hex-geometry';

export interface ITongueSpec {
  /** The category's tile, at the tongue's base by the frame's edge. */
  root: IHexBox;
  /** Where the tongue points, before its tip curls. */
  aim: IPoint;
  /** How far it reaches from its root. */
  length: number;
  /** Half the tongue's width at its base; it narrows to nothing at the tip. */
  halfWidth: number;
  /** How many places it carries. */
  items: number;
  /** Its places' size, where it differs from the rest's. */
  itemR?: number;
}

export interface ITongueTile extends IHexBox {
  key: string;
  /** Along the tongue from its root, px: when it comes in. */
  s: number;
  /** Which of the tongue's places it carries, in reading order; none for a plain tile. */
  item?: number;
  lift: number;
  drift: boolean;
}

/** Each tongue bows a little, and its tip curls clockwise over the last part of its length. */
const BOW = 0.22;
const CURL = { from: 0.55, turn: 1.05 };
/** The places' tiles, on a honeycomb with room for the category's tile among them; no plain tiles round them. */
export const ITEM_R = 78;
const ITEM_CELL = 88;

interface ISample extends IPoint {
  theta: number;
  s: number;
}

function centreLine({ root, aim, length }: ITongueSpec, ds = 3): ISample[] {
  const theta0 = Math.atan2(aim.y - root.y, aim.x - root.x);
  const out: ISample[] = [];
  let x = root.x;
  let y = root.y;
  for (let s = 0; s <= length; s += ds) {
    const t = Math.max(0, (s / length - CURL.from) / (1 - CURL.from));
    const theta = theta0 + BOW * Math.sin((Math.PI * s) / length) - BOW * 0.5 + CURL.turn * t * t;
    out.push({ x, y, theta, s });
    x += Math.cos(theta) * ds;
    y += Math.sin(theta) * ds;
  }
  return out;
}

/** Where a point sits against a tongue: along it (s) and how far off its line, beside the nearest sample. */
function locate(path: ISample[], p: IPoint): { s: number; d: number } {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < path.length; i += 2) {
    const dd = (path[i].x - p.x) ** 2 + (path[i].y - p.y) ** 2;
    if (dd < bestD) {
      bestD = dd;
      best = i;
    }
  }
  return { s: path[best].s, d: Math.sqrt(bestD) };
}

/** Every tongue's tiles, laid out together so none touches another's. */
export function layTongues({
  specs,
  width,
  height,
  apart: separate = false,
  along = 0.4,
  itemR = ITEM_R,
  across,
}: {
  specs: ITongueSpec[];
  width: number;
  height: number;
  /** Each tongue laid out on its own, clear only of the categories, as when only one is out at a time. */
  apart?: boolean;
  /** How much a place's distance off the line counts against it: more, and the tongue runs out longer and slimmer. */
  along?: number;
  /** The places' size. */
  itemR?: number;
  /** At most this many places across, right of the category, the tongue running taller instead. */
  across?: number;
}): ITongueTile[][] {
  const cellOf = (r: number) => r + (ITEM_CELL - ITEM_R);
  const roots = specs.map((t) => t.root);
  let placed: IHexBox[] = [...roots];
  const inFrame = (b: IHexBox) =>
    b.x - b.r * APO >= 0 && b.x + b.r * APO <= width && b.y - b.r >= 0 && b.y + b.r <= height;
  const clear = (b: IHexBox, gap: number) => inFrame(b) && placed.every((p) => apart(b, p, gap));

  const paths = specs.map((spec) => centreLine(spec));
  /** Half the tongue's width at `s` along it: all of it beside and behind the category's tile. */
  const half = (t: number, s: number) => specs[t].halfWidth * Math.max(0, 1 - s / specs[t].length);
  const out: ITongueTile[][] = specs.map(() => []);

  // 1. the places: cells of a honeycomb round the category's tile, inside the triangle, the base filled first; if
  // the triangle holds too few, the rest go just outside it
  specs.forEach((spec, t) => {
    if (separate) placed = [...roots];
    const placeR = spec.itemR ?? itemR;
    const itemCell = cellOf(placeR);
    const cells: Array<{ box: IHexBox; s: number; d: number; score: number }> = [];
    for (let q = -10; q <= 10; q++) {
      for (let r = -10; r <= 10; r++) {
        if (q === 0 && r === 0) continue;
        const p = axial(q, r, itemCell);
        const box = { x: spec.root.x + p.x, y: spec.root.y + p.y, r: placeR };
        if (across !== undefined && p.x > across * SQRT3 * itemCell + 1) continue;
        const { s, d } = locate(paths[t], box);
        cells.push({ box, s, d, score: s + along * d });
      }
    }
    cells.sort((a, b) => a.score - b.score);
    const picked: Array<{ box: IHexBox; s: number }> = [];
    // held to a few across, a tongue may not fit its triangle, so a last pass places the rest wherever is nearest
    for (const margin of across === undefined ? [-0.35, 0.4, 1.2] : [-0.35, 0.4, 1.2, Infinity]) {
      for (const cell of cells) {
        if (picked.length >= spec.items) break;
        if (cell.d > half(t, cell.s) + placeR * margin || !clear(cell.box, 5)) continue;
        placed.push(cell.box);
        picked.push(cell);
      }
    }
    // read as a page: row by row of the honeycomb, top to bottom, each left to right
    const row = (b: IHexBox) => Math.round(b.y / (1.5 * itemCell));
    picked.sort((a, b) => row(a.box) - row(b.box) || a.box.x - b.box.x);
    picked.forEach((cell, k) => {
      out[t].push({ key: `t${t}i${k}`, ...cell.box, s: cell.s, item: k, lift: 0.62, drift: true });
    });
  });

  return out;
}

/** The category tiles' size: a cell of the places' honeycomb, a little larger than a place. */
export const ROOT_R = 86;

/**
 * Five tongues for a frame of `width` × `height`: from the left, two from the top, from the right and from the
 * bottom (clockwise), each pointing at the middle and reaching part of the way, `items` places on each.
 */
export function edgeSpecs(width: number, height: number, items: number[]): ITongueSpec[] {
  const middle = { x: width / 2, y: height / 2 };
  const inset = ROOT_R * APO + 8;
  const top = ROOT_R + 8;
  const sides = { length: width * 0.4, halfWidth: Math.min(300, height * 0.36) };
  const ends = { length: height * 0.46, halfWidth: Math.min(250, width * 0.16) };
  const at = [
    { x: inset, y: middle.y, ...sides },
    { x: width * 0.32, y: top, ...ends },
    { x: width * 0.68, y: top, ...ends },
    { x: width - inset, y: middle.y, ...sides },
    { x: middle.x, y: height - top, ...ends },
  ];
  return at.map(({ x, y, length, halfWidth }, i) => ({
    root: { x, y, r: ROOT_R },
    aim: middle,
    length,
    halfWidth,
    items: items[i] ?? 0,
  }));
}

/**
 * Five tongues out of a column of categories straight down the frame's left, one above another (as large as fits
 * the height, up to ROOT_R): each fans out to the right, towards a point right of the middle, laid out on its own
 * since one is out at a time.
 */
export function columnSpecs(
  width: number,
  height: number,
  items: number[],
  /** Where the tongues point, and how wide they start: by default right of the middle, and a third of the height. */
  { aim = { x: width * 0.62, y: height / 2 }, halfWidth = height * 0.3 }: { aim?: IPoint; halfWidth?: number } = {}
): ITongueSpec[] {
  const gap = 8;
  const n = items.length;
  const r = Math.min(ROOT_R, (height - 32 - (n - 1) * gap) / (2 * n));
  return items.map((count, i) => ({
    root: { x: r * APO + 18, y: height / 2 + (i - (n - 1) / 2) * (2 * r + gap), r },
    aim,
    length: width * 0.5,
    halfWidth,
    items: count,
  }));
}
