export type Vec3 = [x: number, y: number, z: number];

export function distanceSquare(a: Vec3, b: Vec3): number {
  const [xa, ya, za] = a;
  const [xb, yb, zb] = b;
  const x = xa - xb;
  const y = ya - yb;
  const z = za - zb;
  return x * x + y * y + z * z;
}

export function add(a: Vec3, b: Vec3): Vec3 {
  const [xa, ya, za] = a;
  const [xb, yb, zb] = b;
  return [xa + xb, ya + yb, za + zb];
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  const [xa, ya, za] = a;
  const [xb, yb, zb] = b;
  return [xa - xb, ya - yb, za - zb];
}

export function center(a: Vec3, b: Vec3): Vec3 {
  const [xa, ya, za] = a;
  const [xb, yb, zb] = b;
  return [(xa + xb) * 0.5, (ya + yb) * 0.5, (za + zb) * 0.5];
}

export function dot(a: Vec3, b: Vec3): number {
  const [xa, ya, za] = a;
  const [xb, yb, zb] = b;
  return xa * xb + ya * yb + za * zb;
}

export function dot2(a: Vec3): number {
  return dot(a, a);
}

export function scale(a: Vec3, f: number): Vec3 {
  const [x, y, z] = a;
  return [x * f, y * f, z * f];
}

export function sign(v: number) {
  if (v === 0) return 0;
  return v < 0 ? -1 : +1;
}
