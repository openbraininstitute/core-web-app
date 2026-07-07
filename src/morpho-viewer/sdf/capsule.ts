import { add, dot, dot2, scale, sign, subtract, type Vec3 } from './_common';

export function sdfCapsule(p: Vec3, a: Vec3, b: Vec3, r1: number, r2: number) {
  // sampling independent computations (only depend on shape)
  const ba = subtract(b, a);
  const l2 = dot(ba, ba);
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;

  // sampling dependant computations
  const pa = subtract(p, a);
  const y = dot(pa, ba);
  const z = y - l2;
  const x2 = dot2(subtract(scale(pa, l2), scale(ba, y)));
  const y2 = y * y * l2;
  const z2 = z * z * l2;

  // single square root!
  const k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

export function sdfCapsuleWithNormal(
  p: Vec3,
  a: Vec3,
  b: Vec3,
  r1: number,
  r2: number
): {
  distance: number;
  normal: Vec3;
} {
  // sampling independent computations (only depend on shape)
  const ba = subtract(b, a);
  const l2 = dot(ba, ba);
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;

  const pa: Vec3 = subtract(p, a);
  const pb: Vec3 = subtract(p, b);
  const y = dot(pa, ba);
  const z = y - l2; //dot(pb,ba)
  const x2 = l2 * dot(pa, pa) - y * y;
  const y2 = y * y;
  const z2 = z * z;
  const k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) {
    const w = Math.sqrt(il2 * (x2 + z2));
    return { distance: w - r2, normal: scale(pb, 1 / w) };
  }
  if (sign(y) * a2 * y2 < k) {
    const w = Math.sqrt(il2 * (x2 + y2));
    return { distance: w - r1, normal: scale(pa, 1 / w) };
  }
  const w = Math.sqrt(x2 * a2);
  // normal := il2 * (rr * ba + (a2 * (pa * l2 - y * ba)) / w),
  const normal = scale(
    add(scale(ba, rr), scale(subtract(scale(pa, l2), scale(ba, y)), a2)),
    il2 / w
  );
  return {
    distance: (w + y * rr) * il2 - r1,
    normal,
  };
}
