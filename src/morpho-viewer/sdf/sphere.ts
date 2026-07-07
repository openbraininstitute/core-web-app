import type { Vec3 } from './_common';

export function sdfSphere([x, y, z]: Vec3, [centerX, centerY, centerZ]: Vec3, radius: number) {
  const xx = x - centerX;
  const yy = y - centerY;
  const zz = z - centerZ;
  return xx * xx + yy * yy + zz * zz - radius * radius;
}
