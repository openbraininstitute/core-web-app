import { quat, vec3 } from 'gl-matrix';

/**
 * In a circuit, each cell has a center and a quaternion to define its orientation.
 * We must use `tranform()` on its morphology to get the real world coordinates.
 */
export function transform(
  x: number,
  y: number,
  z: number,
  {
    center,
    orientation,
  }: {
    center: [x: number, y: number, z: number];
    orientation: [x: number, y: number, z: number, w: number];
  }
): [x: number, y: number, z: number] {
  const point = vec3.fromValues(x, y, z);
  vec3.transformQuat(point, point, quat.fromValues(...orientation));
  vec3.add(point, point, center);
  return [point[0], point[1], point[2]];
}
