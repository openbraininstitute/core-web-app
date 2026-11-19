type Point = { x: number; y: number };
type Box = { left: number; top: number; right: number; bottom: number };

/** Hull of the exit point and target box; the pointer can cross it without closing. */
export function graceArea(exit: Point, target: Box): Point[] {
  // Pad the narrow end so a slight sideways drift stays inside.
  const pad = 5;
  return hull([
    { x: exit.x - pad, y: exit.y - pad },
    { x: exit.x + pad, y: exit.y - pad },
    { x: exit.x - pad, y: exit.y + pad },
    { x: exit.x + pad, y: exit.y + pad },
    { x: target.left, y: target.top },
    { x: target.right, y: target.top },
    { x: target.right, y: target.bottom },
    { x: target.left, y: target.bottom },
  ]);
}

export function inBox(point: Point, box: Box) {
  return point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom;
}

export function inPolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

// Monotone chain; the corridor is always convex, so a hull is all it needs.
function hull(points: Point[]) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

// Only keyboard focus opens the label; a mouse press already showed it on hover.
let modality: 'keyboard' | 'pointer' = 'keyboard';
let listening = false;

export function watchModality() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('keydown', () => (modality = 'keyboard'), true);
  window.addEventListener('pointerdown', () => (modality = 'pointer'), true);
}

export function focusFromKeyboard() {
  return modality === 'keyboard';
}
